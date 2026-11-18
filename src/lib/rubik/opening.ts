import { Matrix4, Quaternion, Vector3 } from "three";
import { stageView } from "../three/view.ts";
import { CUBE } from "./dimensions.ts";
import type { CubieDefinition, CubieKind } from "./model.ts";
import { OPEN_ORIENTATION } from "./orientation.ts";

/**
 * The opening: the cube is turned, layer by layer, and then its pieces fly
 * out of the view, leaving what it held.
 *
 * Like the finale it is a pure function of one value, `open`:
 *
 *   0             the solved cube
 *   0 … SCRAMBLED its layers turn one after another — real Rubik's moves, a
 *                 quarter turn each — so it ends scrambled but still whole
 *   SCRAMBLED … 1 the 27 pieces leave along fixed paths, the outer ones first
 *   1             nothing of the cube is left in view
 *
 * Run backward it is the cube returning and solving itself. Nothing is
 * random: the same value always gives the same transforms.
 */

/** Share of `open` during which the layers turn. */
export const SCRAMBLED = 0.5;

type Axis = "x" | "y" | "z";

export interface Move {
  axis: Axis;
  /** Which of the three layers along the axis turns. */
  layer: -1 | 1;
  /** Quarter turns, counter-clockwise seen from the positive end of the axis. */
  quarters: -1 | 1;
}

/**
 * The moves, in order. In the hero's three-quarter view yellow is on top
 * (−Y), with blue (−Z) and red (+X) toward the viewer: the top layer turns
 * first, then the two near sides, then the bottom the other way.
 */
export const SCRAMBLE: readonly Move[] = [
  { axis: "y", layer: -1, quarters: 1 },
  { axis: "x", layer: 1, quarters: -1 },
  { axis: "z", layer: -1, quarters: 1 },
  { axis: "y", layer: 1, quarters: -1 },
];

const AXES: Record<Axis, Vector3> = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
};

/** Outer pieces leave first, then the ones they uncover; fractions of the flight. */
const DELAY: Record<CubieKind, number> = { corner: 0, edge: 0.1, center: 0.2, core: 0.3 };
/** Pieces of a kind do not leave all at once: each waits up to this much longer. */
const DELAY_SPREAD = 0.08;
const FLIGHT_SHARE = 1 - Math.max(...Object.values(DELAY)) - DELAY_SPREAD;

/** How far past the edge of the view a piece ends up, in cube units. */
const EXIT_MARGIN = { min: 0.3, max: 1.5 } as const;
/** Half the diagonal of a cubie: how far its silhouette can reach from its center. */
const CUBIE_REACH = (CUBE.cubieSize * Math.sqrt(3)) / 2;
/** Pieces that sit in the middle of the view have no outward direction of their own. */
const CENTERED = 0.35;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** A piece never comes closer to the camera than this share of the camera's distance. */
const NEAREST = 0.45;
/** Closest two pieces may end up to each other, in cube units. */
const SEPARATION = 1.2;
/** Turn of a piece over its whole flight, in radians: they tumble as they go. */
const TUMBLE = { min: 1.2, max: 3 } as const;

export interface CubieOpening {
  /** Position and turn of the cubie after each move; index 0 is the solved cube. */
  positions: Vector3[];
  turns: Quaternion[];
  /** Whether the cubie is in the layer each move turns. */
  turning: boolean[];
  /** Displacement over the whole flight, in the cube's local space. */
  travel: Vector3;
  /** Axis and total angle of the tumble. */
  axis: Vector3;
  tumble: number;
  /** When the cubie leaves, as a fraction of the flight. */
  delay: number;
}

/** A fixed pseudo-random number in [0, 1) for a piece: the same piece always gets the same one. */
function hash(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** A flight starts at once — the piece pops loose — and keeps gathering speed until it is gone. */
const takeOff = (t: number) => 0.3 * t + 0.7 * t * t * t;

/**
 * Precomputes the opening for a viewport's aspect ratio (width / height):
 * where a piece must go to be out of view depends on the shape of the view.
 * `orientation` is the orientation the cube holds while its pieces leave.
 */
export function createOpening(
  cubies: CubieDefinition[],
  aspect: number,
  orientation: Quaternion = OPEN_ORIENTATION,
): CubieOpening[] {
  const view = stageView(aspect);
  const toLocal = orientation.clone().invert();
  /** Where the pieces placed so far end up, as the camera sees them. */
  const destinations: Vector3[] = [];

  return cubies.map((cubie, index) => {
    // --- The moves: where the cubie is after each one -----------------------
    const positions = [new Vector3(...cubie.coords)];
    const turns = [new Quaternion()];
    const turning: boolean[] = [];
    for (const move of SCRAMBLE) {
      const position = positions[positions.length - 1];
      const turn = turns[turns.length - 1];
      const inLayer = Math.round(position[move.axis]) === move.layer;
      turning.push(inLayer);
      if (!inLayer) {
        positions.push(position);
        turns.push(turn);
        continue;
      }
      const quarter = new Quaternion().setFromAxisAngle(AXES[move.axis], (move.quarters * Math.PI) / 2);
      // Back on the lattice exactly: rounding errors must not pile up from move to move.
      positions.push(position.clone().applyQuaternion(quarter).round());
      turns.push(quarter.multiply(turn).normalize());
    }
    for (const position of new Set(positions)) position.multiplyScalar(CUBE.spacing);

    // --- The flight: from where the moves left it to out of view ------------
    const seen = positions[positions.length - 1].clone().applyQuaternion(orientation);
    const offCenter = Math.hypot(seen.x, seen.y);
    // Away from the middle of the view, a little off the exact line so the pieces do not fan out evenly.
    const angle =
      (offCenter > CENTERED ? Math.atan2(seen.y, seen.x) : index * GOLDEN_ANGLE) + (hash(index, 1) - 0.5) * 0.5;
    const direction = new Vector3(Math.cos(angle), Math.sin(angle), 0);

    // Depth: front pieces come toward the viewer, rear ones recede, each by its own amount.
    const depth = Math.min(NEAREST * view.distance, Math.max(-4, seen.z * 1.6 + (hash(index, 2) - 0.35) * 5));
    // Perspective: what is nearer the camera looks larger and further from the middle.
    const magnification = view.distance / (view.distance - depth);
    // How far out the piece must appear to be, along its direction, for all of
    // it to be past the nearest edge of the view — and then a little further.
    const clear = CUBIE_REACH * magnification + EXIT_MARGIN.min + (EXIT_MARGIN.max - EXIT_MARGIN.min) * hash(index, 3);
    const apparent = Math.min(
      (view.halfWidth + clear) / Math.max(1e-6, Math.abs(direction.x)),
      (view.halfHeight + clear) / Math.max(1e-6, Math.abs(direction.y)),
    );
    const destination = direction.clone().multiplyScalar(apparent / magnification).setZ(depth);
    // No two pieces end in the same place: one that would goes further along its own way.
    while (destinations.some((other) => other.distanceTo(destination) < SEPARATION)) {
      destination.addScaledVector(direction, SEPARATION);
    }
    destinations.push(destination.clone());

    const axis = new Vector3(hash(index, 4) - 0.5, hash(index, 5) - 0.5, hash(index, 6) - 0.5);
    if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);

    return {
      positions,
      turns,
      turning,
      travel: destination.sub(seen).applyQuaternion(toLocal),
      axis: axis.normalize(),
      tumble: (TUMBLE.min + (TUMBLE.max - TUMBLE.min) * hash(index, 7)) * (index % 2 === 0 ? 1 : -1),
      delay: DELAY[cubie.kind] + DELAY_SPREAD * hash(index, 8),
    };
  });
}

/** How far along its flight a cubie is, 0 to 1, for a given `open`. */
export function flightProgress(opening: CubieOpening, open: number): number {
  const flight = (open - SCRAMBLED) / (1 - SCRAMBLED);
  return takeOff(Math.min(1, Math.max(0, (flight - opening.delay) / FLIGHT_SHARE)));
}

const position = new Vector3();
const rotation = new Quaternion();
const partial = new Quaternion();
const UNIT = new Vector3(1, 1, 1);

/**
 * Writes the transform of every cubie for a given `open` into `out`.
 * At 0 these are exactly the resting transforms of the solved cube.
 * Scale is never touched: each piece keeps its geometry.
 */
export function openingTransforms(out: Matrix4[], openings: CubieOpening[], open: number): Matrix4[] {
  const moves = SCRAMBLE.length;

  if (open <= SCRAMBLED) {
    // One move at a time, each eased on its own: the cube clicks from one to the next.
    const at = (Math.max(0, open) / SCRAMBLED) * moves;
    const current = Math.min(moves - 1, Math.floor(at));
    const move = SCRAMBLE[current];
    partial.setFromAxisAngle(AXES[move.axis], ((move.quarters * Math.PI) / 2) * easeInOutCubic(Math.min(1, at - current)));

    for (let index = 0; index < openings.length; index++) {
      const opening = openings[index];
      position.copy(opening.positions[current]);
      rotation.copy(opening.turns[current]);
      if (opening.turning[current]) {
        position.applyQuaternion(partial);
        rotation.premultiply(partial);
      }
      out[index].compose(position, rotation, UNIT);
    }
    return out;
  }

  for (let index = 0; index < openings.length; index++) {
    const opening = openings[index];
    const progress = flightProgress(opening, open);
    position.copy(opening.positions[moves]).addScaledVector(opening.travel, progress);
    rotation.setFromAxisAngle(opening.axis, opening.tumble * progress).multiply(opening.turns[moves]);
    out[index].compose(position, rotation, UNIT);
  }
  return out;
}
