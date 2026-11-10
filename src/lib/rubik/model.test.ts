import assert from "node:assert/strict";
import { test } from "node:test";
import { OPPOSITE_FACE, SECTIONS } from "../../data/navigation.ts";
import { FACE_COLORS, FACE_NORMALS, createCubies, type Vec3 } from "./model.ts";

const cubies = createCubies();
const stickers = cubies.flatMap((cubie) => cubie.stickers.map((sticker) => ({ ...sticker, cubie })));

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const negate = (a: Vec3): Vec3 => [-a[0] || 0, -a[1] || 0, -a[2] || 0];

test("the cube has exactly 27 uniquely identified cubies filling a 3×3×3 grid", () => {
  assert.equal(cubies.length, 27);
  assert.equal(new Set(cubies.map((cubie) => cubie.id)).size, 27);
  for (const cubie of cubies) {
    for (const component of cubie.coords) assert.ok([-1, 0, 1].includes(component));
  }
});

test("cubies split into 1 core, 6 centers, 12 edges and 8 corners", () => {
  const count = (kind: string) => cubies.filter((cubie) => cubie.kind === kind).length;
  assert.deepEqual([count("core"), count("center"), count("edge"), count("corner")], [1, 6, 12, 8]);
  for (const cubie of cubies) {
    const expected = { core: 0, center: 1, edge: 2, corner: 3 }[cubie.kind];
    assert.equal(cubie.stickers.length, expected);
  }
});

test("there are six faces with nine panels each, 54 in total", () => {
  assert.equal(FACE_COLORS.length, 6);
  assert.equal(stickers.length, 54);
  for (const face of FACE_COLORS) {
    assert.equal(stickers.filter((sticker) => sticker.face === face).length, 9, face);
  }
});

test("only outward-facing sides of a cubie carry a panel", () => {
  for (const sticker of stickers) {
    assert.equal(dot(sticker.cubie.coords, sticker.normal), 1);
    assert.deepEqual(sticker.normal, FACE_NORMALS[sticker.face]);
  }
  // Conversely, every outer side of every cubie has one: 6 faces × 9 positions.
  const outerSides = cubies.reduce(
    (total, cubie) => total + cubie.coords.filter((component) => component !== 0).length,
    0,
  );
  assert.equal(outerSides, 54);
});

test("the cube is solved: all panels of a face share one color and one direction", () => {
  for (const face of FACE_COLORS) {
    const normals = new Set(stickers.filter((sticker) => sticker.face === face).map((sticker) => sticker.normal.join()));
    assert.equal(normals.size, 1, face);
  }
});

test("opposite pairs are white–yellow, blue–green and red–orange", () => {
  assert.equal(OPPOSITE_FACE.white, "yellow");
  assert.equal(OPPOSITE_FACE.blue, "green");
  assert.equal(OPPOSITE_FACE.red, "orange");
  for (const face of FACE_COLORS) {
    assert.equal(OPPOSITE_FACE[OPPOSITE_FACE[face]], face);
    assert.deepEqual(FACE_NORMALS[OPPOSITE_FACE[face]], negate(FACE_NORMALS[face]), face);
  }
});

test("no cubie carries two opposite colors", () => {
  for (const cubie of cubies) {
    const faces = cubie.stickers.map((sticker) => sticker.face);
    for (const face of faces) assert.ok(!faces.includes(OPPOSITE_FACE[face]), cubie.id);
  }
});

test("handedness matches a real cube: white up and green front put red on the right", () => {
  assert.deepEqual(cross(FACE_NORMALS.white, FACE_NORMALS.green), FACE_NORMALS.red);
});

test("every cube face is the portal of exactly one section", () => {
  const faces = SECTIONS.flatMap((section) => (section.face ? [section.face] : []));
  assert.deepEqual([...faces].sort(), [...FACE_COLORS].sort());
});
