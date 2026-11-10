import assert from "node:assert/strict";
import { test } from "node:test";
import { Quaternion } from "three";
import { IDLE, idleFloat, idleOrientation } from "./idle.ts";
import { HERO_ORIENTATION, visibleFaces } from "./orientation.ts";

const heroFaces = [...visibleFaces(HERO_ORIENTATION)].sort();

test("idle motion never changes which faces are visible", () => {
  const orientation = new Quaternion();
  for (let x = -1; x <= 1; x += 0.25) {
    for (let y = -1; y <= 1; y += 0.25) {
      for (let time = 0; time < 60; time += 0.7) {
        idleOrientation(orientation, x, y, time);
        assert.deepEqual([...visibleFaces(orientation, 0.15)].sort(), heroFaces, `pointer (${x}, ${y}) at ${time}s`);
      }
    }
  }
});

test("with the pointer centered the cube stays within the ambient sway of its resting orientation", () => {
  const orientation = new Quaternion();
  for (let time = 0; time < 60; time += 0.3) {
    idleOrientation(orientation, 0, 0, time);
    assert.ok(orientation.angleTo(HERO_ORIENTATION) <= IDLE.swayYaw + IDLE.swayPitch + 1e-9);
  }
});

test("the float stays within its amplitude", () => {
  for (let time = 0; time < 60; time += 0.1) {
    assert.ok(Math.abs(idleFloat(time)) <= IDLE.float);
  }
});
