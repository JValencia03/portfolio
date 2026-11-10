import { Matrix4, Quaternion, Vector3 } from "three";
import { CUBE } from "./dimensions.ts";
import type { CubieDefinition, CubieKind } from "./model.ts";
import { HERO_ORIENTATION } from "./orientation.ts";

/**
 * The finale: the solved cube comes apart into its 27 cubies.
 *
 * Every cubie travels a fixed straight path from its place in the cube to a
 * fixed destination, turning slightly as it goes. Where it is depends only
 * on `spread` (0 assembled, 1 fully apart), so the separation is exactly
 * reversible and identical on every visit — an exploded view, not a burst
 * of particles.
 *
 * Destinations are chosen in screen terms, for the three-quarter orientation
 * the cube holds during the finale: the lattice expands, and every piece is
 * also pushed away from the middle of the view, which leaves the center
 * clear for the Resume content.
 */

/** How much the lattice itself grows. */
const EXPANSION = 1.75;
/** Extra distance every cubie moves away from the center of the view, in cube units. */
const CLEARANCE = 1.5;
/**
 * The core has no side of its own to flee to: it recedes behind everything,
 * leaning away from wherever the rear pieces end up so it never crosses them.
 */
const CORE_DEPTH = -5.5;
const CORE_SIDESTEP = 2.4;

/** Largest turn of a cubie over the whole separation, in radians. Small: pieces stay recognizable. */
const MAX_TURN = 0.55;

/**
 * Outer pieces leave first, then the ones they uncover. Delays are fractions
 * of the whole separation; each cubie then uses the remaining time.
 */
const DELAY: Record<CubieKind, number> = { corner: 0, edge: 0.1, center: 0.2, core: 0.28 };
const TRAVEL_SHARE = 1 - Math.max(...Object.values(DELAY));

export interface CubieSeparation {
  /** Resting position in the cube's local space. */
  rest: Vector3;
  /** Displacement at full spread, in the cube's local space. */
  travel: Vector3;
  /** Axis and total angle of the turn. */
  axis: Vector3;
  turn: number;
  /** When this cubie starts moving, as a fraction of the separation. */
  delay: number;
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Precomputes each cubie's path. `orientation` is the cube's orientation during the finale. */
export function createSeparation(cubies: CubieDefinition[], orientation: Quaternion = HERO_ORIENTATION): CubieSeparation[] {
  const toLocal = orientation.clone().invert();

  /** Displacement of an outer cubie, as seen by the camera. */
  const outerTravel = (seen: Vector3) => {
    // Away from the middle of the view, in the plane of the screen.
    const outward = new Vector3(seen.x, seen.y, 0);
    if (outward.lengthSq() < 1e-6) outward.set(0, -1, 0);
    outward.normalize();
    return seen.clone().multiplyScalar(EXPANSION - 1).addScaledVector(outward, CLEARANCE);
  };

  // Where the pieces behind the cube's center end up, on average: the core avoids that side.
  const rearSide = new Vector3();
  for (const cubie of cubies) {
    if (cubie.kind === "core") continue;
    const seen = new Vector3(...cubie.coords).multiplyScalar(CUBE.spacing).applyQuaternion(orientation);
    const destination = seen.clone().add(outerTravel(seen));
    if (destination.z >= 0) continue;
    // Nearer rear pieces weigh more: they are the ones the core could meet.
    const weight = 1 / (1 + destination.lengthSq());
    rearSide.add(new Vector3(destination.x, destination.y, 0).normalize().multiplyScalar(weight));
  }
  const coreSide = rearSide.lengthSq() > 1e-9 ? rearSide.normalize().negate() : new Vector3(0, 1, 0);

  return cubies.map((cubie, index) => {
    const rest = new Vector3(...cubie.coords).multiplyScalar(CUBE.spacing);
    // Where the cubie sits as seen by the camera.
    const seen = rest.clone().applyQuaternion(orientation);

    const travelSeen =
      cubie.kind === "core" ? coreSide.clone().multiplyScalar(CORE_SIDESTEP).setZ(CORE_DEPTH) : outerTravel(seen);

    // A fixed, slightly different turn per cubie — derived from its index, not from chance.
    const axis = new Vector3().crossVectors(rest, new Vector3(0.3, 1, 0.2));
    if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
    axis.normalize();
    const variation = ((index * 37) % 10) / 10;

    return {
      rest,
      travel: travelSeen.applyQuaternion(toLocal),
      axis,
      turn: MAX_TURN * (0.55 + 0.45 * variation) * (index % 2 === 0 ? 1 : -1),
      delay: DELAY[cubie.kind],
    };
  });
}

/** How far along its own path a cubie is, 0 to 1, for a given overall spread. */
export function cubieProgress(separation: CubieSeparation, spread: number): number {
  const local = (spread - separation.delay) / TRAVEL_SHARE;
  return easeInOutCubic(Math.min(1, Math.max(0, local)));
}

const position = new Vector3();
const rotation = new Quaternion();
const UNIT = new Vector3(1, 1, 1);

/**
 * How far the pieces travel, relative to the default, for a viewport's
 * aspect ratio. On a wide screen the default clears the middle; on a narrow
 * one the cube is drawn smaller, so the pieces must go proportionally
 * further to leave the same room for the content.
 */
export function separationReach(aspect: number): number {
  return Math.min(2.3, Math.max(1, 1.25 / aspect));
}

/**
 * Writes the transform of every cubie for a given spread into `out`.
 * At spread 0 these are exactly the resting transforms of the solved cube,
 * whatever the reach. Scale is never touched: each piece keeps its geometry.
 */
export function separationTransforms(
  out: Matrix4[],
  separations: CubieSeparation[],
  spread: number,
  reach = 1,
): Matrix4[] {
  for (let index = 0; index < separations.length; index++) {
    const separation = separations[index];
    const progress = cubieProgress(separation, spread);
    position.copy(separation.rest).addScaledVector(separation.travel, progress * reach);
    rotation.setFromAxisAngle(separation.axis, separation.turn * progress);
    out[index].compose(position, rotation, UNIT);
  }
  return out;
}
