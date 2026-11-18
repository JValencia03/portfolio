import { BoxGeometry, Float32BufferAttribute, Matrix4, Shape, ShapeGeometry, Vector3, type BufferGeometry } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * Proportions of a background cube, for an edge of 1. They follow the cube
 * in the foreground: rounded pieces with a seam between them, and a rounded
 * tile set into every outer side.
 */
const MINI = {
  /** Distance between the centers of neighboring cubies. */
  cell: 1 / 3,
  /** Side of a cubie. Smaller than the cell, which leaves a real seam. */
  cubie: 0.307,
  cubieRadius: 0.05,
  /** Side of a tile, and how far it stands off the cubie under it. */
  tile: 0.238,
  tileRadius: 0.06,
  tileLift: 0.006,
  /** A block in the middle, so nothing shows straight through the seams. */
  core: 0.6,
} as const;

/**
 * The six sides of a cube in gray: each face of a solved cube has its own
 * color, and here each has its own tone, so a background cube still reads as
 * a Rubik's Cube with the color taken out.
 */
const FACE_TONES: Array<{ normal: [number, number, number]; tone: number }> = [
  { normal: [0, 1, 0], tone: 1 },
  { normal: [0, -1, 0], tone: 0.46 },
  { normal: [0, 0, 1], tone: 0.8 },
  { normal: [0, 0, -1], tone: 0.56 },
  { normal: [1, 0, 0], tone: 0.66 },
  { normal: [-1, 0, 0], tone: 0.9 },
];

const GRID = [-1, 0, 1] as const;

export interface FloatingCubeGeometry {
  /** The 26 outer cubies and the core, as one geometry. */
  body: BufferGeometry;
  /** The 54 tiles as one geometry, each face's tone baked into its vertex colors. */
  tiles: BufferGeometry;
  dispose: () => void;
}

/**
 * A whole 3×3×3 cube as two geometries, so a field of them costs two or
 * three draw calls however many there are: every cube is one instance of
 * the body and one of the tiles.
 */
export function createFloatingCubeGeometry(): FloatingCubeGeometry {
  const cubie = new RoundedBoxGeometry(MINI.cubie, MINI.cubie, MINI.cubie, 1, MINI.cubieRadius);
  const bodies: BufferGeometry[] = [];
  for (const x of GRID) {
    for (const y of GRID) {
      for (const z of GRID) {
        // The one in the middle is never seen.
        if (x === 0 && y === 0 && z === 0) continue;
        bodies.push(cubie.clone().translate(x * MINI.cell, y * MINI.cell, z * MINI.cell));
      }
    }
  }
  // Same attributes and indexing as the cubies, so they merge into one geometry.
  const core = new BoxGeometry(MINI.core, MINI.core, MINI.core);
  bodies.push(cubie.index ? core : core.toNonIndexed());
  const body = mergeGeometries(bodies);

  // One rounded tile, facing +Z; every other one is a copy turned onto its face.
  const inner = MINI.tile / 2 - MINI.tileRadius;
  const outline = new Shape();
  outline.absarc(inner, inner, MINI.tileRadius, 0, Math.PI / 2);
  outline.absarc(-inner, inner, MINI.tileRadius, Math.PI / 2, Math.PI);
  outline.absarc(-inner, -inner, MINI.tileRadius, Math.PI, Math.PI * 1.5);
  outline.absarc(inner, -inner, MINI.tileRadius, Math.PI * 1.5, Math.PI * 2);
  const tile = new ShapeGeometry(outline, 3);

  const forward = new Vector3(0, 0, 1);
  const surface = MINI.cell + MINI.cubie / 2 + MINI.tileLift;
  const tiles: BufferGeometry[] = [];
  for (const { normal, tone } of FACE_TONES) {
    const direction = new Vector3(...normal);
    const turn = new Matrix4().lookAt(direction, new Vector3(), Math.abs(direction.y) > 0.5 ? forward : new Vector3(0, 1, 0));
    // The two directions that span the face.
    const across = new Vector3(1, 0, 0).applyMatrix4(turn);
    const along = new Vector3(0, 1, 0).applyMatrix4(turn);
    for (const u of GRID) {
      for (const v of GRID) {
        const position = direction
          .clone()
          .multiplyScalar(surface)
          .addScaledVector(across, u * MINI.cell)
          .addScaledVector(along, v * MINI.cell);
        const placed = tile.clone().applyMatrix4(turn.clone().setPosition(position));
        const count = placed.getAttribute("position").count;
        placed.setAttribute("color", new Float32BufferAttribute(new Array(count * 3).fill(tone), 3));
        tiles.push(placed);
      }
    }
  }
  const merged = mergeGeometries(tiles);

  return {
    body,
    tiles: merged,
    dispose() {
      body.dispose();
      merged.dispose();
    },
  };
}
