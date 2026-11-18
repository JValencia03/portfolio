import assert from "node:assert/strict";
import { test } from "node:test";
import { Matrix4, Quaternion, Vector3 } from "three";
import { stageView } from "../three/view.ts";
import { CUBE } from "./dimensions.ts";
import { createCubeLayout } from "./layout.ts";
import { SCRAMBLE, SCRAMBLED, createOpening, flightProgress, openingTransforms } from "./opening.ts";
import { OPEN_ORIENTATION } from "./orientation.ts";

const layout = createCubeLayout();
const WIDE = 16 / 9;
const openings = createOpening(layout.cubies, WIDE);
const blank = () => layout.cubies.map(() => new Matrix4());
const at = (open: number, source = openings) => openingTransforms(blank(), source, open);

const positionOf = (matrix: Matrix4) => new Vector3().setFromMatrixPosition(matrix);
const turnOf = (matrix: Matrix4) => new Quaternion().setFromRotationMatrix(matrix);
/** Where each move ends, as a value of `open`. */
const afterMove = (move: number) => (SCRAMBLED * move) / SCRAMBLE.length;
const key = (position: Vector3) => position.toArray().map((value) => Math.round(value)).join();

test("at 0 the cube is exactly the solved, assembled cube", () => {
  at(0).forEach((matrix, index) => {
    matrix.elements.forEach((value, element) => {
      assert.ok(Math.abs(value - layout.rest[index].elements[element]) < 1e-12, `cubie ${index} is displaced at rest`);
    });
  });
});

test("each move turns one layer of nine cubies a quarter turn and leaves the cube whole", () => {
  const lattice = new Set(layout.cubies.map((cubie) => cubie.coords.join()));
  SCRAMBLE.forEach((move, index) => {
    assert.equal(openings.filter((opening) => opening.turning[index]).length, 9, `move ${index} turns a whole layer`);

    const before = at(afterMove(index));
    const after = at(afterMove(index + 1));
    // Every cubie is back on the lattice, each place taken exactly once.
    assert.deepEqual(new Set(after.map((matrix) => key(positionOf(matrix)))), lattice, `after move ${index}`);
    after.forEach((matrix, cubie) => {
      const position = positionOf(matrix);
      assert.ok(position.distanceTo(position.clone().round()) < 1e-9, `cubie ${cubie} is off the lattice after move ${index}`);
      const turned = turnOf(before[cubie]).angleTo(turnOf(matrix));
      const expected = openings[cubie].turning[index] ? Math.PI / 2 : 0;
      assert.ok(Math.abs(turned - expected) < 1e-6, `cubie ${cubie} turns ${turned} in move ${index}`);
      // Only the layer's own cubies move, and they stay in their layer.
      if (!openings[cubie].turning[index]) assert.ok(position.distanceTo(positionOf(before[cubie])) < 1e-9);
      else assert.ok(Math.abs(position[move.axis] - move.layer * CUBE.spacing) < 1e-9);
    });
  });
});

test("the moves leave the cube scrambled", () => {
  const scrambled = at(SCRAMBLED);
  const moved = scrambled.filter((matrix, index) => positionOf(matrix).distanceTo(positionOf(layout.rest[index])) > 0.5).length;
  // Four different layers: most of the outside has changed place.
  assert.ok(moved >= 16, `only ${moved} cubies changed place`);
  // The core and the two centers no move touches stay put.
  const still = scrambled.filter((matrix, index) => matrix.equals(layout.rest[index])).length;
  assert.ok(still >= 1);
});

test("while its layers turn the cube stays one piece: no cubie leaves its distance from the middle", () => {
  for (let open = 0; open <= SCRAMBLED; open += 0.004) {
    at(open).forEach((matrix, index) => {
      const rest = positionOf(layout.rest[index]).length();
      assert.ok(Math.abs(positionOf(matrix).length() - rest) < 1e-9, `cubie ${index} drifts at ${open.toFixed(3)}`);
    });
  }
});

test("turning layers never pass through the rest of the cube", () => {
  for (let open = 0; open <= SCRAMBLED; open += 0.01) {
    const positions = at(open).map(positionOf);
    for (let a = 0; a < positions.length; a++) {
      for (let b = a + 1; b < positions.length; b++) {
        assert.ok(positions[a].distanceTo(positions[b]) > 0.99 * CUBE.spacing, `cubies ${a} and ${b} collide at ${open.toFixed(2)}`);
      }
    }
  }
});

test("motion is smooth: no cubie jumps between nearby values, across the moves and into the flight", () => {
  let previous = at(0).map(positionOf);
  for (let open = 0.0005; open <= 1; open += 0.0005) {
    const current = at(open).map(positionOf);
    current.forEach((position, index) => {
      assert.ok(position.distanceTo(previous[index]) < 0.06, `cubie ${index} jumps at ${open.toFixed(4)}`);
    });
    previous = current;
  }
});

test("the opening is deterministic and reverses exactly", () => {
  const forward: number[][] = [];
  for (let step = 0; step <= 40; step++) forward.push(at(step / 40).flatMap((matrix) => [...matrix.elements]));
  const backward: number[][] = [];
  for (let step = 40; step >= 0; step--) backward.push(at(step / 40).flatMap((matrix) => [...matrix.elements]));
  assert.deepEqual(backward.reverse(), forward);
  // A second, independently built opening is identical: nothing is random.
  const again = at(0.83, createOpening(layout.cubies, WIDE));
  at(0.83).forEach((matrix, index) => assert.ok(matrix.equals(again[index])));
});

test("outer pieces leave first: corners, then edges, then centers, then the core", () => {
  const flown = (kind: string, flight: number) =>
    openings
      .filter((_, index) => layout.cubies[index].kind === kind)
      .map((opening) => flightProgress(opening, SCRAMBLED + (1 - SCRAMBLED) * flight));
  assert.ok(flown("corner", 0.09).every((progress) => progress > 0));
  assert.ok(flown("edge", 0.09).every((progress) => progress === 0));
  assert.ok(flown("edge", 0.19).every((progress) => progress > 0));
  assert.ok(flown("center", 0.19).every((progress) => progress === 0));
  assert.ok(flown("center", 0.29).every((progress) => progress > 0));
  assert.ok(flown("core", 0.29).every((progress) => progress === 0));
  // Nothing has left before the moves are done, and everything has arrived at the end.
  assert.ok(openings.every((opening) => flightProgress(opening, SCRAMBLED) === 0));
  assert.ok(openings.every((opening) => flightProgress(opening, 1) === 1));
});

test("fully open, nothing of the cube is left in view — on wide, square and tall screens", () => {
  /** Half the diagonal of a cubie: the furthest its silhouette reaches from its center. */
  const reach = (CUBE.cubieSize * Math.sqrt(3)) / 2;
  for (const aspect of [21 / 9, WIDE, 4 / 3, 1, 3 / 4, 9 / 16, 9 / 19.5]) {
    const view = stageView(aspect);
    at(1, createOpening(layout.cubies, aspect)).forEach((matrix, index) => {
      const seen = positionOf(matrix).applyQuaternion(OPEN_ORIENTATION);
      // In front of the camera, never through it.
      assert.ok(seen.z < view.distance * 0.5, `cubie ${index} reaches the camera at ${aspect.toFixed(2)}`);
      const magnification = view.distance / (view.distance - seen.z);
      const outside =
        Math.abs(seen.x) * magnification - reach * magnification > view.halfWidth ||
        Math.abs(seen.y) * magnification - reach * magnification > view.halfHeight;
      assert.ok(outside, `cubie ${index} is still in view at ${aspect.toFixed(2)}`);
    });
  }
});

test("every cubie takes its own way out", () => {
  const ends = at(1).map(positionOf);
  for (let a = 0; a < ends.length; a++) {
    for (let b = a + 1; b < ends.length; b++) {
      assert.ok(ends[a].distanceTo(ends[b]) > 0.5, `cubies ${a} and ${b} end in the same place`);
    }
  }
});
