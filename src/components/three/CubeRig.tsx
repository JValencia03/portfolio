import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Quaternion, type Group } from "three";
import { idleFloat, idleTilt } from "@/lib/rubik/idle";
import { HERO_ORIENTATION } from "@/lib/rubik/orientation";
import { CUBE_EDGE } from "@/lib/rubik/dimensions";
import { pointer } from "@/lib/three/pointer";
import type { Quality } from "@/lib/three/quality";
import { RubiksCube } from "./RubiksCube";
import { CAMERA_FOV, CAMERA_REST_Z, sceneFrame } from "./sceneFrame";

/** The HTML element the cube sits on while idle (the hero's center column). */
const ANCHOR_SELECTOR = "[data-cube-anchor]";

/**
 * Side of the anchor element divided by the cube's edge. Above 1 so the
 * turned cube, whose silhouette is wider than its edge, still fits.
 */
const ANCHOR_FIT = 1.62;

/** How quickly the pointer's influence follows the pointer; higher is snappier. */
const POINTER_DAMPING = 4;

const TAN_HALF_FOV = Math.tan((CAMERA_FOV * Math.PI) / 360);
const IDENTITY = new Quaternion();

/**
 * Places, sizes and turns the cube for the current frame.
 *
 * Two placements are blended by the pose's `stage` value:
 *   - the hero anchor: an HTML element whose rectangle is projected into the
 *     scene every frame, so the cube sits exactly where the layout puts it;
 *   - the stage: centered in the viewport, where transitions are performed.
 *
 * Orientation is the pose's deterministic orientation plus idle motion
 * (float, sway, a bounded lean toward the pointer), weighted by the pose —
 * idle motion fades out as soon as a scroll transition takes over.
 *
 * Everything happens in refs inside the render loop: no React renders.
 */
export function CubeRig({ quality }: { quality: Quality }) {
  const rig = useRef<Group>(null);
  const cube = useRef<Group>(null);
  const anchor = useRef<Element | null>(null);
  const eased = useRef({ x: 0, y: 0 });
  const tilt = useRef(new Quaternion());

  useEffect(() => {
    anchor.current = document.querySelector(ANCHOR_SELECTOR);
  }, []);

  useFrame((state, rawDelta) => {
    const rigGroup = rig.current;
    const cubeGroup = cube.current;
    const element = anchor.current;
    if (!rigGroup || !cubeGroup || !element) return;

    const { pose, choreographed } = sceneFrame;
    const stage = choreographed ? pose.stage : 0;
    const { width, height } = state.size;

    // --- Placement -----------------------------------------------------------
    const rect = element.getBoundingClientRect();
    const anchorOnScreen = rect.width > 0 && rect.bottom > 0 && rect.top < height && rect.right > 0 && rect.left < width;
    const visible = choreographed ? pose.shown && pose.presence > 0 && (stage > 0 || anchorOnScreen) : anchorOnScreen;
    rigGroup.visible = visible;
    if (!visible) return;

    // World units per CSS pixel on the stage plane (z = 0), with the camera at rest.
    const worldPerPixel = (2 * TAN_HALF_FOV * CAMERA_REST_Z) / height;
    const anchorX = (rect.left + rect.width / 2 - width / 2) * worldPerPixel;
    const anchorY = -(rect.top + rect.height / 2 - height / 2) * worldPerPixel;
    const anchorScale = (Math.min(rect.width, rect.height) * worldPerPixel) / (CUBE_EDGE * ANCHOR_FIT);

    // The stage is the origin, so blending toward it is a blend toward zero.
    rigGroup.position.x = anchorX * (1 - stage);
    rigGroup.position.y = anchorY * (1 - stage);
    rigGroup.scale.setScalar(anchorScale + (sceneFrame.stageScale - anchorScale) * stage);

    // --- Orientation -----------------------------------------------------------
    if (!choreographed) {
      // Reduced motion, or nothing measured yet: the cube rests, still.
      cubeGroup.position.y = 0;
      cubeGroup.quaternion.copy(HERO_ORIENTATION);
      return;
    }

    const idle = pose.idle;
    if (idle <= 0) {
      cubeGroup.position.y = 0;
      cubeGroup.quaternion.copy(pose.orientation);
      return;
    }

    // Exponential smoothing keeps the pointer's influence identical at any frame rate.
    const delta = Math.min(rawDelta, 0.1);
    const time = state.clock.elapsedTime;
    const pointerEase = 1 - Math.exp(-POINTER_DAMPING * delta);
    eased.current.x += (pointer.x - eased.current.x) * pointerEase;
    eased.current.y += (pointer.y - eased.current.y) * pointerEase;

    // Idle lean, scaled by its weight, applied on top of the scroll-driven orientation.
    idleTilt(tilt.current, eased.current.x, eased.current.y, time);
    tilt.current.slerpQuaternions(IDENTITY, tilt.current, idle);
    cubeGroup.quaternion.copy(tilt.current).multiply(pose.orientation);
    cubeGroup.position.y = idleFloat(time) * CUBE_EDGE * idle;
  });

  return (
    <group ref={rig} visible={false}>
      <group ref={cube} quaternion={HERO_ORIENTATION}>
        <RubiksCube quality={quality} />
      </group>
    </group>
  );
}
