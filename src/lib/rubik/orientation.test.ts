import assert from "node:assert/strict";
import { test } from "node:test";
import { Quaternion, Vector3 } from "three";
import { OPPOSITE_FACE } from "../../data/navigation.ts";
import { FACE_COLORS, FACE_NORMALS } from "./model.ts";
import { FACE_ORIENTATIONS, HERO_ORIENTATION, visibleFaces } from "./orientation.ts";

const EPSILON = 1e-9;
const normalOf = (face: keyof typeof FACE_NORMALS) => new Vector3(...FACE_NORMALS[face]);
const close = (actual: Vector3, expected: [number, number, number], message?: string) =>
  assert.ok(actual.distanceTo(new Vector3(...expected)) < EPSILON, `${message ?? ""} got ${actual.toArray()}`);

test("each face orientation turns exactly that face perpendicular to the camera", () => {
  for (const face of FACE_COLORS) {
    const orientation = FACE_ORIENTATIONS[face];
    assert.ok(Math.abs(orientation.length() - 1) < EPSILON, `${face} is a unit quaternion`);
    close(normalOf(face).applyQuaternion(orientation), [0, 0, 1], face);
    close(normalOf(OPPOSITE_FACE[face]).applyQuaternion(orientation), [0, 0, -1], face);
    assert.deepEqual(visibleFaces(orientation), [face]);
  }
});

test("side faces keep white on top when aligned", () => {
  for (const face of ["green", "red", "blue", "orange"] as const) {
    close(normalOf("white").applyQuaternion(FACE_ORIENTATIONS[face]), [0, 1, 0], face);
  }
});

test("orientations are rigid rotations: face geometry and handedness are preserved", () => {
  for (const orientation of [...Object.values(FACE_ORIENTATIONS), HERO_ORIENTATION]) {
    const white = normalOf("white").applyQuaternion(orientation);
    const green = normalOf("green").applyQuaternion(orientation);
    const red = normalOf("red").applyQuaternion(orientation);
    close(new Vector3().crossVectors(white, green), red.toArray());
  }
});

test("any face can be reached from any other, including the opposite one, without a full turn", () => {
  for (const from of FACE_COLORS) {
    for (const to of FACE_COLORS) {
      const start = FACE_ORIENTATIONS[from];
      const end = FACE_ORIENTATIONS[to];
      assert.ok(start.angleTo(end) <= Math.PI + EPSILON, `${from} → ${to}`);

      // The interpolation is a valid rotation at every step and lands exactly on the target.
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const step = new Quaternion().slerpQuaternions(start, end, t);
        assert.ok(Math.abs(step.length() - 1) < 1e-6, `${from} → ${to} @ ${t}`);
      }
      close(normalOf(to).applyQuaternion(new Quaternion().slerpQuaternions(start, end, 1)), [0, 0, 1], `${from} → ${to}`);
    }
  }
});

test("the hero orientation reveals three physically adjacent faces", () => {
  const visible = visibleFaces(HERO_ORIENTATION);
  assert.deepEqual([...visible].sort(), ["blue", "red", "yellow"]);
  // Adjacent means no two of them are opposite: they meet at one corner.
  for (const face of visible) assert.ok(!visible.includes(OPPOSITE_FACE[face]));
  // Each of the three is turned clearly toward the camera, not seen edge-on.
  for (const face of visible) {
    assert.ok(normalOf(face).applyQuaternion(HERO_ORIENTATION).z > 0.3, face);
  }
  // Yellow is the top face.
  assert.ok(normalOf("yellow").applyQuaternion(HERO_ORIENTATION).y > 0.5);
});
