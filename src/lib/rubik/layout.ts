import { Matrix4, Quaternion, Vector3 } from "three";
import type { FaceColor } from "@/data/navigation";
import { CUBE, PANEL_OFFSET } from "./dimensions.ts";
import { FACE_COLORS, FACE_NORMALS, createCubies, type CubieDefinition } from "./model.ts";

/**
 * Where every part of the cube sits, as transforms.
 *
 * The cube is drawn with instanced meshes — one draw call for all 27 glass
 * shells, one for all cores, one per color for the panels — instead of a
 * mesh per part. Identity is kept in the data: every instance belongs to a
 * cubie by index, and a cubie's parts always move together.
 */

export interface PanelInstance {
  /** Index of the cubie this panel belongs to. */
  cubie: number;
  face: FaceColor;
  /** Placement of the panel relative to its cubie's center. */
  local: Matrix4;
}

export interface CubeLayout {
  cubies: CubieDefinition[];
  /** Resting transform of each cubie in the cube's local space, by cubie index. */
  rest: Matrix4[];
  /** The nine panels of each face, each tied to its cubie. */
  panels: Record<FaceColor, PanelInstance[]>;
}

const FORWARD = new Vector3(0, 0, 1);
const UNIT = new Vector3(1, 1, 1);

/** Rotation that turns a panel, modeled facing +Z, toward a face's normal. */
function panelRotation(face: FaceColor): Quaternion {
  return new Quaternion().setFromUnitVectors(FORWARD, new Vector3(...FACE_NORMALS[face]));
}

export function createCubeLayout(): CubeLayout {
  const cubies = createCubies();
  const rest = cubies.map(({ coords }) =>
    new Matrix4().makeTranslation(coords[0] * CUBE.spacing, coords[1] * CUBE.spacing, coords[2] * CUBE.spacing),
  );

  const panels = Object.fromEntries(FACE_COLORS.map((face) => [face, [] as PanelInstance[]])) as Record<
    FaceColor,
    PanelInstance[]
  >;
  cubies.forEach((cubie, index) => {
    for (const { face, normal } of cubie.stickers) {
      const position = new Vector3(...normal).multiplyScalar(PANEL_OFFSET);
      panels[face].push({ cubie: index, face, local: new Matrix4().compose(position, panelRotation(face), UNIT) });
    }
  });

  return { cubies, rest, panels };
}
