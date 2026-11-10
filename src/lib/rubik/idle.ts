import { Euler, Quaternion } from "three";
import { HERO_ORIENTATION } from "./orientation.ts";

/**
 * Idle motion of the cube while no scroll transition is in charge.
 * Pure functions of pointer position and time, so they are deterministic
 * and testable; the render loop only smooths toward their output.
 */
export const IDLE = {
  /** Largest turn the pointer can add around the vertical axis, in radians. */
  pointerYaw: 0.2,
  /** Largest turn the pointer can add around the horizontal axis, in radians. */
  pointerPitch: 0.14,
  /** Amplitude of the slow ambient sway, in radians. */
  swayYaw: 0.05,
  swayPitch: 0.03,
  /** Amplitude of the vertical float, as a fraction of the cube's size. */
  float: 0.035,
} as const;

const tiltEuler = new Euler();
const tilt = new Quaternion();

/**
 * The idle lean: a small world-space rotation applied on top of whatever
 * orientation the cube has.
 *
 * @param pointerX Horizontal pointer position, -1 (left) to 1 (right).
 * @param pointerY Vertical pointer position, -1 (bottom) to 1 (top).
 * @param time Seconds; drives the ambient sway.
 */
export function idleTilt(out: Quaternion, pointerX: number, pointerY: number, time: number): Quaternion {
  const pitch = -pointerY * IDLE.pointerPitch + Math.sin(time * 0.5) * IDLE.swayPitch;
  const yaw = pointerX * IDLE.pointerYaw + Math.sin(time * 0.37) * IDLE.swayYaw;
  return out.setFromEuler(tiltEuler.set(pitch, yaw, 0, "XYZ"));
}

/**
 * Resting orientation plus the idle lean. The bounds are small enough that
 * the same three faces always stay visible: the pointer can lean the cube,
 * never turn it to a different face (verified in idle.test.ts).
 */
export function idleOrientation(out: Quaternion, pointerX: number, pointerY: number, time: number): Quaternion {
  idleTilt(tilt, pointerX, pointerY, time);
  return out.copy(tilt).multiply(HERO_ORIENTATION);
}

/** Vertical offset of the floating cube, as a fraction of its size. */
export function idleFloat(time: number): number {
  return Math.sin(time * 0.9) * IDLE.float;
}
