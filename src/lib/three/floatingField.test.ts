import assert from "node:assert/strict";
import { test } from "node:test";
import { createFloatingField, easeDisplacement, repulsionFalloff, repulsionTarget, wrap } from "./floatingField.ts";

const field = createFloatingField(70);

test("the field is deterministic: the same seed always gives the same cubes", () => {
  assert.deepEqual(createFloatingField(70), field);
  assert.notDeepEqual(createFloatingField(70, 1), field);
});

test("cubes stay inside the volume and vary in depth and size", () => {
  for (const cube of field) {
    assert.ok(cube.u >= -1 && cube.u <= 1 && cube.v >= -1 && cube.v <= 1);
    assert.ok(cube.depth >= 0 && cube.depth <= 1);
    assert.ok(cube.size >= 0.4 && cube.size <= 1.2);
    assert.ok(Math.abs(Math.hypot(...cube.axis) - 1) < 1e-9, "spin axis is a unit vector");
    assert.ok(cube.fall > 0, "every cube drifts downward");
  }
  const depths = field.map((cube) => cube.depth);
  assert.ok(Math.min(...depths) < 0.15 && Math.max(...depths) > 0.85, "the whole depth range is used");
  assert.ok(new Set(field.map((cube) => cube.size.toFixed(2))).size > 30, "sizes are varied");
});

test("the field is neither a grid nor clumped", () => {
  // No rows or columns: positions do not repeat along either axis.
  assert.equal(new Set(field.map((cube) => cube.u.toFixed(2))).size > 55, true);
  assert.equal(new Set(field.map((cube) => cube.v.toFixed(2))).size > 55, true);

  // Every cube keeps some distance from its nearest neighbor…
  const nearest = field.map((cube, index) =>
    Math.min(...field.filter((_, other) => other !== index).map((other) => Math.hypot(cube.u - other.u, cube.v - other.v, (cube.depth - other.depth) * 0.6))),
  );
  assert.ok(Math.min(...nearest) > 0.05, `two cubes nearly overlap (${Math.min(...nearest)})`);
  // …but those distances are not all alike, as they would be on a lattice.
  const mean = nearest.reduce((sum, value) => sum + value, 0) / nearest.length;
  const deviation = Math.sqrt(nearest.reduce((sum, value) => sum + (value - mean) ** 2, 0) / nearest.length);
  assert.ok(deviation / mean > 0.08, "spacing is too regular");
});

test("nearer cubes drift faster on average: depth reads through motion", () => {
  const average = (cubes: typeof field) => cubes.reduce((sum, cube) => sum + cube.fall, 0) / cubes.length;
  assert.ok(average(field.filter((cube) => cube.depth < 0.33)) > average(field.filter((cube) => cube.depth > 0.66)));
});

test("only some cubes carry the accent color", () => {
  const accents = field.filter((cube) => cube.accent).length;
  assert.ok(accents > 5 && accents < field.length / 2, `${accents} accent cubes`);
});

test("wrap keeps values in range and only shifts them by whole spans", () => {
  for (let value = -50; value <= 50; value += 0.37) {
    const wrapped = wrap(value, 4);
    assert.ok(wrapped >= -4 && wrapped < 4);
    // It only ever moves a value by whole spans.
    const spans = (value - wrapped) / 8;
    assert.ok(Math.abs(spans - Math.round(spans)) < 1e-9);
  }
});

test("repulsion falls off smoothly: full at the pointer, zero at the radius, no jumps between", () => {
  assert.equal(repulsionFalloff(0, 3), 1);
  assert.equal(repulsionFalloff(3, 3), 0);
  assert.equal(repulsionFalloff(10, 3), 0);
  let previous = 1;
  for (let distance = 0.01; distance <= 3.2; distance += 0.01) {
    const value = repulsionFalloff(distance, 3);
    assert.ok(value <= previous + 1e-12, "falloff must decrease with distance");
    assert.ok(previous - value < 0.012, `falloff jumps at ${distance}`);
    previous = value;
  }
  // It arrives at zero gently: just inside the radius the push is already negligible.
  assert.ok(repulsionFalloff(2.95, 3) < 0.002);
});

test("the push points away from the pointer and is never longer than the limit", () => {
  const out = { x: 0, y: 0 };
  for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
    for (const distance of [0.01, 0.5, 1.5, 2.9]) {
      const cubeX = 2 + Math.cos(angle) * distance;
      const cubeY = -1 + Math.sin(angle) * distance;
      repulsionTarget(out, cubeX, cubeY, 2, -1, 3, 1.2);
      const length = Math.hypot(out.x, out.y);
      assert.ok(length <= 1.2 + 1e-9);
      // Same direction as pointer → cube.
      assert.ok(out.x * (cubeX - 2) + out.y * (cubeY + 1) > 0);
    }
  }
  repulsionTarget(out, 9, 9, 2, -1, 3, 1.2);
  assert.deepEqual(out, { x: 0, y: 0 });
  // Directly under the pointer the push is still finite and well defined.
  repulsionTarget(out, 2, -1, 2, -1, 3, 1.2);
  assert.ok(Number.isFinite(out.x) && Number.isFinite(out.y));
  assert.ok(Math.abs(Math.hypot(out.x, out.y) - 1.2) < 1e-9);
});

test("displacement eases to its target without overshooting, at any frame rate", () => {
  for (const delta of [1 / 240, 1 / 60, 1 / 30, 0.1]) {
    // Pushed away…
    let value = 0;
    let previous = 0;
    for (let step = 0; step < 600; step++) {
      value = easeDisplacement(value, 1, delta);
      assert.ok(value >= previous && value <= 1, `overshoot pushing at ${delta}s`);
      previous = value;
    }
    assert.ok(value > 0.99);
    // …then released: back toward rest, never crossing it.
    for (let step = 0; step < 1200; step++) {
      const next = easeDisplacement(value, 0, delta);
      assert.ok(next <= value && next >= 0, `overshoot recovering at ${delta}s`);
      value = next;
    }
    assert.ok(value < 0.01);
  }
});

test("recovery is slower than the push", () => {
  const pushed = easeDisplacement(0, 1, 0.1);
  const recovered = 1 - easeDisplacement(1, 0, 0.1);
  assert.ok(pushed > recovered);
});
