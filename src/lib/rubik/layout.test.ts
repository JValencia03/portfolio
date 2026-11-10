import assert from "node:assert/strict";
import { test } from "node:test";
import { Matrix4, Vector3 } from "three";
import { OPPOSITE_FACE } from "../../data/navigation.ts";
import { CUBE, PANEL_OFFSET } from "./dimensions.ts";
import { createCubeLayout } from "./layout.ts";
import { FACE_COLORS, FACE_NORMALS } from "./model.ts";

const layout = createCubeLayout();
const close = (a: Vector3, b: Vector3, message: string) => assert.ok(a.distanceTo(b) < 1e-9, `${message}: ${a.toArray()} ≠ ${b.toArray()}`);

/** Where a panel ends up in the cube's space, and which way it faces. */
function placed(face: (typeof FACE_COLORS)[number], index: number) {
  const panel = layout.panels[face][index];
  const world = new Matrix4().multiplyMatrices(layout.rest[panel.cubie], panel.local);
  return {
    panel,
    position: new Vector3().setFromMatrixPosition(world),
    facing: new Vector3(0, 0, 1).transformDirection(world),
  };
}

test("there is one resting transform per cubie, on the 3×3×3 grid", () => {
  assert.equal(layout.rest.length, 27);
  const seen = new Set<string>();
  layout.rest.forEach((matrix, index) => {
    const position = new Vector3().setFromMatrixPosition(matrix);
    close(position, new Vector3(...layout.cubies[index].coords).multiplyScalar(CUBE.spacing), `cubie ${index}`);
    seen.add(position.toArray().join());
  });
  assert.equal(seen.size, 27);
});

test("each color has nine panel instances, 54 in total", () => {
  let total = 0;
  for (const face of FACE_COLORS) {
    assert.equal(layout.panels[face].length, 9, face);
    total += layout.panels[face].length;
  }
  assert.equal(total, 54);
});

test("every panel faces outward along its face's normal and lies on that face", () => {
  for (const face of FACE_COLORS) {
    const normal = new Vector3(...FACE_NORMALS[face]);
    layout.panels[face].forEach((_, index) => {
      const { position, facing } = placed(face, index);
      close(facing, normal, `${face} panel ${index} faces`);
      // All nine lie in one plane, just under the outer surface of the cube.
      assert.ok(Math.abs(position.dot(normal) - (CUBE.spacing + PANEL_OFFSET)) < 1e-9, `${face} panel ${index} depth`);
    });
  }
});

test("the nine panels of a face cover the nine cells of that face", () => {
  for (const face of FACE_COLORS) {
    const normal = new Vector3(...FACE_NORMALS[face]);
    const cells = new Set(
      layout.panels[face].map((_, index) => {
        const { position } = placed(face, index);
        // Remove the component along the normal: what is left is the cell on the face.
        return position
          .addScaledVector(normal, -position.dot(normal))
          .toArray()
          .map((value) => Math.round(value))
          .join();
      }),
    );
    assert.equal(cells.size, 9, face);
  }
});

test("each panel belongs to a cubie that actually touches that face", () => {
  for (const face of FACE_COLORS) {
    for (const panel of layout.panels[face]) {
      const cubie = layout.cubies[panel.cubie];
      assert.ok(cubie.stickers.some((sticker) => sticker.face === face), `${face} on cubie ${cubie.id}`);
      assert.ok(!cubie.stickers.some((sticker) => sticker.face === OPPOSITE_FACE[face]));
    }
  }
});

test("a cubie's panels follow it when it moves", () => {
  const corner = layout.cubies.findIndex((cubie) => cubie.kind === "corner");
  const moved = layout.rest[corner].clone().premultiply(new Matrix4().makeTranslation(5, 0, 0));
  for (const face of FACE_COLORS) {
    for (const panel of layout.panels[face].filter((candidate) => candidate.cubie === corner)) {
      const before = new Vector3().setFromMatrixPosition(new Matrix4().multiplyMatrices(layout.rest[corner], panel.local));
      const after = new Vector3().setFromMatrixPosition(new Matrix4().multiplyMatrices(moved, panel.local));
      close(after.sub(before), new Vector3(5, 0, 0), `${face} panel of cubie ${corner}`);
    }
  }
});
