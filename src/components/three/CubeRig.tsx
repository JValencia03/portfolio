import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { AdditiveBlending, CanvasTexture, Quaternion, SRGBColorSpace, type Group, type Sprite, type SpriteMaterial } from "three";
import { idleFloat, idleTilt } from "@/lib/rubik/idle";
import { HERO_ORIENTATION } from "@/lib/rubik/orientation";
import { CUBE_EDGE } from "@/lib/rubik/dimensions";
import { pointer } from "@/lib/three/pointer";
import type { Quality } from "@/lib/three/quality";
import { RubiksCube } from "./RubiksCube";
import { CAMERA_FOV, CAMERA_REST_Z, sceneFrame } from "./sceneFrame";

/** The HTML element the cube sits on while idle (the hero's center column). */
const ANCHOR_SELECTOR = "[data-cube-anchor]:not([data-replica])";
/** The same element in the copy of the hero that closes the document: where the loop brings the cube back to. */
const REPLICA_SELECTOR = "[data-cube-anchor][data-replica]";

/**
 * Side of the anchor element divided by the cube's edge. Above 1 so the
 * turned cube, whose silhouette is wider than its edge, still fits.
 */
const ANCHOR_FIT = 1.4;

/** How quickly the pointer's influence follows the pointer; higher is snappier. */
const POINTER_DAMPING = 4;

/** Width of the flare, in cube edges: as it first shows and at its brightest. */
const FLARE_SIZE = { ember: 1.5, full: 4.6 } as const;

const TAN_HALF_FOV = Math.tan((CAMERA_FOV * Math.PI) / 360);
const IDENTITY = new Quaternion();

/** A soft disc of light: white-hot in the middle, falling away to nothing well before its edge. */
function createFlareTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.12, "rgba(255, 248, 232, 0.82)");
    gradient.addColorStop(0.34, "rgba(255, 226, 190, 0.3)");
    gradient.addColorStop(0.62, "rgba(255, 210, 170, 0.08)");
    gradient.addColorStop(1, "rgba(255, 210, 170, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

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
 * It also carries the flare: light that blooms from the middle of the cube
 * as it opens, closes or comes back together, drawn over its pieces.
 *
 * Everything happens in refs inside the render loop: no React renders.
 */
export function CubeRig({ quality }: { quality: Quality }) {
  const rig = useRef<Group>(null);
  const cube = useRef<Group>(null);
  const flare = useRef<Sprite>(null);
  const anchor = useRef<Element | null>(null);
  const replica = useRef<Element | null>(null);
  const eased = useRef({ x: 0, y: 0 });
  const tilt = useRef(new Quaternion());
  const [flareTexture] = useState(createFlareTexture);

  useEffect(() => {
    anchor.current = document.querySelector(ANCHOR_SELECTOR);
  }, []);
  useEffect(() => () => flareTexture.dispose(), [flareTexture]);

  useFrame((state, rawDelta) => {
    const rigGroup = rig.current;
    const cubeGroup = cube.current;
    if (!rigGroup || !cubeGroup || !anchor.current) return;

    const { pose, choreographed, snapshot } = sceneFrame;
    const stage = choreographed ? pose.stage : 0;
    const { width, height } = state.size;

    // On the way back to the start the cube heads for the copy of the hero rising
    // into view; it stands where the real one will once the scroll has gone round.
    let element = anchor.current;
    if (choreographed && snapshot.state === "LOOP") {
      replica.current ??= document.querySelector(REPLICA_SELECTOR);
      element = replica.current ?? element;
    }

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

    // --- Flare -----------------------------------------------------------------
    const sprite = flare.current;
    if (sprite) {
      const strength = choreographed ? pose.flare : 0;
      sprite.visible = strength > 0.001;
      if (sprite.visible) {
        // It swells as it brightens; quality tiers without the glass keep it a little tighter.
        const reach = quality.transmission ? 1 : 0.85;
        sprite.scale.setScalar(CUBE_EDGE * reach * (FLARE_SIZE.ember + (FLARE_SIZE.full - FLARE_SIZE.ember) * strength));
        (sprite.material as SpriteMaterial).opacity = Math.min(1, strength * 1.15);
      }
    }

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
      {/* Light is added on top of whatever is there, pieces included, and never hides behind them. */}
      <sprite ref={flare} visible={false} renderOrder={10}>
        <spriteMaterial
          map={flareTexture}
          blending={AdditiveBlending}
          transparent
          depthTest={false}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
