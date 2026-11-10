"use client";

import "@/lib/three/silenceClockDeprecation";
import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, type RootState } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { NeutralToneMapping } from "three";
import { scrollStore } from "@/lib/scroll/scrollStore";
import { trackPointer } from "@/lib/three/pointer";
import { detectQuality } from "@/lib/three/quality";
import { CameraRig } from "./CameraRig";
import { CubeRig } from "./CubeRig";
import { FloatingCubes } from "./FloatingCubes";
import { FOG_COLOR, LightingRig } from "./LightingRig";
import { SceneDirector } from "./SceneDirector";
import { CAMERA_FOV, CAMERA_REST_Z, sceneFrame } from "./sceneFrame";

/** How much the pixel ratio changes each time the frame rate asks for it. */
const DPR_STEP = 0.25;
/** Distances from the camera between which the background fades into the dark. */
const FOG_NEAR = 14;
const FOG_FAR = 40;

/** Tells the page the scene is drawing, so the static stand-in can step aside. */
function ReadySignal() {
  const signaled = useRef(false);

  useFrame(() => {
    if (signaled.current) return;
    signaled.current = true;
    document.documentElement.dataset.webgl = "ready";
  });

  useEffect(
    () => () => {
      delete document.documentElement.dataset.webgl;
    },
    [],
  );

  return null;
}

function onCreated(state: RootState) {
  // Neutral tone mapping keeps saturated colors true; the default filmic curve would bleach them.
  state.gl.toneMapping = NeutralToneMapping;
  if (process.env.NODE_ENV !== "production") {
    // Development handles for inspecting the scene from the console.
    Object.assign(window, { __experience: state, __sceneFrame: sceneFrame, __scrollStore: scrollStore });
  }
}

/**
 * The one WebGL canvas of the site. It is mounted by the root layout, fills
 * the viewport behind the HTML and stays alive across every route and
 * language.
 */
export default function ExperienceCanvas() {
  // Decided once from the device's capabilities; see lib/three/quality.ts.
  const [quality] = useState(detectQuality);
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, quality.maxDpr));

  useEffect(() => trackPointer(), []);

  return (
    <Canvas
      // The canvas never takes pointer input; see lib/three/pointer.ts.
      style={{ pointerEvents: "none" }}
      // It is fixed to the viewport, so scrolling never changes its bounds.
      resize={{ scroll: false }}
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      // The near plane is close because the camera ends a transition almost touching a panel.
      camera={{ fov: CAMERA_FOV, position: [0, 0, CAMERA_REST_Z], near: 0.05, far: 60 }}
      onCreated={onCreated}
    >
      {/*
        The pixel ratio follows the measured frame rate, within the tier's bounds:
        it steps down when frames are slow and back up when there is headroom.
        This changes state only on those rare steps, never per frame.
      */}
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setDpr((current) => Math.max(quality.minDpr, current - DPR_STEP))}
        onIncline={() =>
          setDpr((current) => Math.min(quality.maxDpr, window.devicePixelRatio || 1, current + DPR_STEP))
        }
        onFallback={() => setDpr(quality.minDpr)}
      />
      {/* Atmospheric depth: the far background fades into the page's darkness. */}
      <fog attach="fog" args={[FOG_COLOR, FOG_NEAR, FOG_FAR]} />

      {/* Mount order is update order: the director decides the frame, the rigs apply it. */}
      <SceneDirector />
      <CameraRig />
      <LightingRig />
      <FloatingCubes quality={quality} />
      <CubeRig quality={quality} />
      <ReadySignal />
    </Canvas>
  );
}
