/**
 * The field of background cubes, as pure data and math.
 *
 * Generation is seeded, so the field is identical on every visit and the
 * motion is a deterministic function of time, scroll and pointer. Nothing
 * here touches Three.js or the DOM; the component only applies the results.
 */

export interface FloatingCube {
  /** Horizontal and vertical placement, each in -1..1 of the visible area at the cube's depth. */
  u: number;
  v: number;
  /** 0 nearest to the camera, 1 farthest. */
  depth: number;
  /** Edge length in world units. */
  size: number;
  /** Rotation axis (unit vector) and speed in radians per second. */
  axis: [number, number, number];
  spin: number;
  /** Starting angle and phase of the gentle sideways sway. */
  phase: number;
  /** Downward drift in world units per second. */
  fall: number;
  /** Brightness of the cube's gray, 0..1. */
  shade: number;
  /** Whether this cube picks up the active face color as a glow. */
  accent: boolean;
}

/** Small deterministic PRNG (mulberry32). */
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Candidates tried for each cube; the one farthest from its neighbors is kept. */
const CANDIDATES = 10;

/**
 * Scatters `count` cubes through the volume.
 *
 * Placement uses best-candidate sampling: each new cube goes to the emptiest
 * of a few random spots. The result is evenly spread but irregular — neither
 * the clumps of plain randomness nor the rows of a grid.
 */
export function createFloatingField(count: number, seed = 20240527): FloatingCube[] {
  const random = createRandom(seed);
  const cubes: FloatingCube[] = [];

  for (let index = 0; index < count; index++) {
    let best = { u: 0, v: 0, depth: 0, distance: -1 };
    for (let candidate = 0; candidate < CANDIDATES; candidate++) {
      const u = random() * 2 - 1;
      const v = random() * 2 - 1;
      const depth = random();
      let nearest = Infinity;
      for (const other of cubes) {
        // Wrap vertically: the field scrolls around in that direction.
        const dv = Math.min(Math.abs(v - other.v), 2 - Math.abs(v - other.v));
        const distance = Math.hypot(u - other.u, dv, (depth - other.depth) * 0.6);
        if (distance < nearest) nearest = distance;
      }
      if (nearest > best.distance) best = { u, v, depth, distance: nearest };
    }

    // A random unit vector for the spin axis.
    const z = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(1 - z * z);

    cubes.push({
      u: best.u,
      v: best.v,
      depth: best.depth,
      size: 0.4 + random() * 0.8,
      axis: [radius * Math.cos(angle), radius * Math.sin(angle), z],
      spin: (0.05 + random() * 0.2) * (random() < 0.5 ? -1 : 1),
      phase: random() * Math.PI * 2,
      // Nearer cubes drift faster: depth reads through motion as well as size.
      fall: (0.1 + random() * 0.22) * (1 - 0.55 * best.depth),
      shade: 0.35 + random() * 0.65,
      accent: random() < 0.2,
    });
  }
  return cubes;
}

/** Wraps `value` into [-half, half). */
export function wrap(value: number, half: number): number {
  const span = half * 2;
  return ((((value + half) % span) + span) % span) - half;
}

/**
 * How strongly a cube at `distance` from the pointer is pushed, 0..1.
 * A smooth bump: 1 at the pointer, 0 at `radius` and beyond, with zero slope
 * at both ends — so cubes neither snap as they enter the radius nor jerk at
 * the center.
 */
export function repulsionFalloff(distance: number, radius: number): number {
  if (distance >= radius) return 0;
  const t = distance / radius;
  const bump = 1 - t * t;
  return bump * bump;
}

/**
 * Displacement a cube should settle at for a pointer at (`pointerX`, `pointerY`),
 * written into `out`. It points directly away from the pointer and is never
 * longer than `maxPush`.
 */
export function repulsionTarget(
  out: { x: number; y: number },
  cubeX: number,
  cubeY: number,
  pointerX: number,
  pointerY: number,
  radius: number,
  maxPush: number,
): void {
  const dx = cubeX - pointerX;
  const dy = cubeY - pointerY;
  const distance = Math.hypot(dx, dy);
  const push = maxPush * repulsionFalloff(distance, radius);
  if (push === 0) {
    out.x = 0;
    out.y = 0;
    return;
  }
  // Exactly under the pointer there is no direction to flee in: go up.
  const inverse = distance > 1e-6 ? 1 / distance : 0;
  out.x = distance > 1e-6 ? dx * inverse * push : 0;
  out.y = distance > 1e-6 ? dy * inverse * push : push;
}

/** How fast a cube moves away from the pointer, and how fast it drifts back, per second. */
export const REPULSION_RATE = { away: 7, back: 2.2 } as const;

/**
 * Moves a displacement one step toward its target.
 *
 * First-order easing: the value approaches the target exponentially and can
 * never overshoot it, so there is no oscillation by construction. Moving
 * away is quicker than coming back, which gives the damped recovery.
 */
export function easeDisplacement(current: number, target: number, delta: number): number {
  const rate = Math.abs(target) > Math.abs(current) ? REPULSION_RATE.away : REPULSION_RATE.back;
  return current + (target - current) * (1 - Math.exp(-rate * delta));
}
