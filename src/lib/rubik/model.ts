import type { FaceColor } from "@/data/navigation";

/**
 * Logical model of the Rubik's Cube: pure data, no rendering.
 *
 * The cube uses the classic color scheme in a right-handed coordinate system
 * (+X right, +Y up, +Z toward the viewer): white up, green front, red right,
 * and therefore yellow down, blue back, orange left.
 *
 * The cube is always solved and never twisted: every sticker keeps the color
 * of the face it sits on, and the whole cube only ever rotates rigidly.
 */

export type Vec3 = readonly [x: number, y: number, z: number];

/** Outward normal of each face in the cube's local space. */
export const FACE_NORMALS: Record<FaceColor, Vec3> = {
  white: [0, 1, 0],
  yellow: [0, -1, 0],
  green: [0, 0, 1],
  blue: [0, 0, -1],
  red: [1, 0, 0],
  orange: [-1, 0, 0],
};

export const FACE_COLORS = Object.keys(FACE_NORMALS) as FaceColor[];

export type CubieKind = "core" | "center" | "edge" | "corner";

const KIND_BY_STICKER_COUNT: CubieKind[] = ["core", "center", "edge", "corner"];

export interface Sticker {
  /** Face the sticker belongs to; also its color. */
  face: FaceColor;
  /** Outward direction of the sticker, in the cube's local space. */
  normal: Vec3;
}

export interface CubieDefinition {
  /** Stable identity, e.g. "1,-1,0". Never changes: the cube is not shuffled. */
  id: string;
  /** Position in the 3×3×3 grid; each component is -1, 0 or 1. */
  coords: Vec3;
  kind: CubieKind;
  /** One sticker per face of the cubie that lies on the outside of the cube. */
  stickers: Sticker[];
}

const GRID = [-1, 0, 1] as const;

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** The 27 cubies of a solved 3×3×3 cube. */
export function createCubies(): CubieDefinition[] {
  const cubies: CubieDefinition[] = [];
  for (const x of GRID) {
    for (const y of GRID) {
      for (const z of GRID) {
        const coords: Vec3 = [x, y, z];
        // A cubie touches a face exactly when it sits on that face's outer layer.
        const stickers = FACE_COLORS.filter((face) => dot(coords, FACE_NORMALS[face]) === 1).map((face) => ({
          face,
          normal: FACE_NORMALS[face],
        }));
        cubies.push({ id: coords.join(","), coords, kind: KIND_BY_STICKER_COUNT[stickers.length], stickers });
      }
    }
  }
  return cubies;
}
