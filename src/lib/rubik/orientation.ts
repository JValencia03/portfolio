import { Matrix4, Quaternion, Vector3 } from "three";
import type { FaceColor } from "@/data/navigation";
import { FACE_COLORS, FACE_NORMALS } from "./model.ts";

/**
 * Whole-cube orientations, as quaternions.
 *
 * Quaternions are used everywhere the cube turns: interpolating between two
 * of them always takes the shortest arc, never accumulates Euler angles and
 * handles 180° turns between opposite faces without special cases.
 *
 * The camera looks down -Z, so a face "looks at the camera" when its normal
 * points to +Z in world space.
 */

const normalOf = (face: FaceColor) => new Vector3(...FACE_NORMALS[face]);

/** The rotation that turns `front` toward the camera with `up` pointing up. */
export function orientationFor(front: FaceColor, up: FaceColor): Quaternion {
  const n = normalOf(front);
  const u = normalOf(up);
  const r = new Vector3().crossVectors(u, n);
  if (r.lengthSq() !== 1) throw new Error(`"${up}" cannot be up while "${front}" faces the camera`);
  // Rows r, u, n: the matrix that maps r → +X, u → +Y, n → +Z.
  const rotation = new Matrix4().set(r.x, r.y, r.z, 0, u.x, u.y, u.z, 0, n.x, n.y, n.z, 0, 0, 0, 0, 1);
  return new Quaternion().setFromRotationMatrix(rotation);
}

/** Face that reads as "up" while a given face looks at the camera. */
const UP_WHEN_FACING: Record<FaceColor, FaceColor> = {
  green: "white",
  red: "white",
  blue: "white",
  orange: "white",
  white: "blue",
  yellow: "green",
};

/** Orientation that aligns each face perpendicular to the camera. */
export const FACE_ORIENTATIONS = Object.fromEntries(
  FACE_COLORS.map((face) => [face, orientationFor(face, UP_WHEN_FACING[face])]),
) as Record<FaceColor, Quaternion>;

/**
 * Resting orientation in the hero: a three-quarter view of the corner shared
 * by yellow (top), blue (left) and red (right) — the faces of the first
 * sections of the narrative, so the visitor sees where the scroll leads.
 */
export const HERO_ORIENTATION = new Quaternion()
  .setFromAxisAngle(new Vector3(1, 0, 0), 0.56)
  .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI / 4))
  .multiply(orientationFor("blue", "yellow"))
  .normalize();

/** Faces turned toward the camera for a given cube orientation. */
export function visibleFaces(orientation: Quaternion, threshold = 1e-6): FaceColor[] {
  return FACE_COLORS.filter((face) => normalOf(face).applyQuaternion(orientation).z > threshold);
}
