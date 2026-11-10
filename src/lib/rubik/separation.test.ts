import assert from "node:assert/strict";
import { test } from "node:test";
import { Matrix4, Quaternion, Vector3 } from "three";
import { createCubeLayout } from "./layout.ts";
import { HERO_ORIENTATION } from "./orientation.ts";
import { createSeparation, separationReach, separationTransforms } from "./separation.ts";

const layout = createCubeLayout();
const separations = createSeparation(layout.cubies);
const blank = () => layout.cubies.map(() => new Matrix4());
const at = (spread: number) => separationTransforms(blank(), separations, spread);

const positionOf = (matrix: Matrix4) => new Vector3().setFromMatrixPosition(matrix);
/** Position as the camera sees it during the finale. */
const seen = (matrix: Matrix4) => positionOf(matrix).applyQuaternion(HERO_ORIENTATION);

test("at spread 0 the cube is exactly the solved, assembled cube", () => {
  at(0).forEach((matrix, index) => {
    assert.ok(matrix.equals(layout.rest[index]), `cubie ${index} is displaced at rest`);
  });
});

test("the separation is deterministic and reverses exactly", () => {
  const forward: number[][] = [];
  for (let spread = 0; spread <= 1.0001; spread += 0.05) forward.push(at(spread).flatMap((matrix) => [...matrix.elements]));
  const backward: number[][] = [];
  for (let spread = 1; spread >= -0.0001; spread -= 0.05) backward.push(at(Math.max(0, spread)).flatMap((matrix) => [...matrix.elements]));
  backward.reverse();
  forward.forEach((frame, step) => {
    frame.forEach((value, index) => assert.ok(Math.abs(value - backward[step][index]) < 1e-9, `step ${step}`));
  });
  // A second, independently built separation is identical: nothing is random.
  const again = separationTransforms(blank(), createSeparation(layout.cubies), 0.63);
  at(0.63).forEach((matrix, index) => assert.ok(matrix.equals(again[index])));
});

test("all 27 cubies take part and each keeps its geometry", () => {
  const end = at(1);
  assert.equal(end.length, 27);
  const scale = new Vector3();
  end.forEach((matrix, index) => {
    assert.ok(positionOf(matrix).distanceTo(positionOf(layout.rest[index])) > 1, `cubie ${index} barely moves`);
    matrix.decompose(new Vector3(), new Quaternion(), scale);
    assert.ok(scale.distanceTo(new Vector3(1, 1, 1)) < 1e-9, `cubie ${index} is scaled`);
  });
  // Every cubie ends somewhere of its own.
  assert.equal(new Set(end.map((matrix) => positionOf(matrix).toArray().map((value) => value.toFixed(3)).join())).size, 27);
});

test("cubies never pass through one another on the way", () => {
  for (let spread = 0; spread <= 1.0001; spread += 0.02) {
    const positions = at(spread).map(positionOf);
    for (let a = 0; a < positions.length; a++) {
      for (let b = a + 1; b < positions.length; b++) {
        // Never closer than neighbors in the assembled cube.
        assert.ok(positions[a].distanceTo(positions[b]) > 0.99, `cubies ${a} and ${b} collide at spread ${spread.toFixed(2)}`);
      }
    }
  }
});

test("motion is smooth: no cubie jumps between nearby values of spread", () => {
  let previous = at(0).map(positionOf);
  for (let spread = 0.002; spread <= 1; spread += 0.002) {
    const current = at(spread).map(positionOf);
    current.forEach((position, index) => {
      assert.ok(position.distanceTo(previous[index]) < 0.06, `cubie ${index} jumps at spread ${spread.toFixed(3)}`);
    });
    previous = current;
  }
});

test("outer pieces leave first: corners, then edges, then centers, then the core", () => {
  const moved = (kind: string, spread: number) =>
    at(spread)
      .map((matrix, index) => ({ kind: layout.cubies[index].kind, distance: positionOf(matrix).distanceTo(positionOf(layout.rest[index])) }))
      .filter((cubie) => cubie.kind === kind)
      .every((cubie) => cubie.distance > 1e-6);
  assert.deepEqual([moved("corner", 0.05), moved("edge", 0.05)], [true, false]);
  assert.deepEqual([moved("edge", 0.15), moved("center", 0.15)], [true, false]);
  assert.deepEqual([moved("center", 0.25), moved("core", 0.25)], [true, false]);
  assert.equal(moved("core", 0.4), true);
});

test("fully apart, the middle of the view is clear for the content", () => {
  at(1).forEach((matrix, index) => {
    const position = seen(matrix);
    if (layout.cubies[index].kind === "core") {
      // The core is not in the way either: it has receded behind everything.
      assert.ok(position.z < -4, "the core should recede");
      return;
    }
    assert.ok(Math.hypot(position.x, position.y) >= 1.5 - 1e-9, `cubie ${index} is left in the middle of the view`);
  });
});

test("on narrow viewports the pieces reach further, without changing the assembled cube or colliding", () => {
  assert.equal(separationReach(16 / 9), 1);
  assert.ok(separationReach(9 / 19.5) > 2);
  assert.ok(separationReach(1) > 1 && separationReach(1) < separationReach(0.6));

  const reach = separationReach(9 / 19.5);
  separationTransforms(blank(), separations, 0, reach).forEach((matrix, index) => {
    assert.ok(matrix.equals(layout.rest[index]), `cubie ${index} is displaced at rest`);
  });
  for (let spread = 0; spread <= 1.0001; spread += 0.04) {
    const positions = separationTransforms(blank(), separations, spread, reach).map(positionOf);
    for (let a = 0; a < positions.length; a++) {
      for (let b = a + 1; b < positions.length; b++) {
        assert.ok(positions[a].distanceTo(positions[b]) > 0.99, `cubies ${a} and ${b} collide at spread ${spread.toFixed(2)}`);
      }
    }
  }
  // Further out than with the default reach.
  const wide = at(1).map(positionOf);
  separationTransforms(blank(), separations, 1, reach).map(positionOf).forEach((position, index) => {
    assert.ok(position.length() > wide[index].length());
  });
});

test("pieces only turn a little, so each stays recognizable", () => {
  at(1).forEach((matrix, index) => {
    const turned = new Quaternion().setFromRotationMatrix(matrix);
    assert.ok(turned.angleTo(new Quaternion()) < 0.6, `cubie ${index} turns too far`);
  });
});
