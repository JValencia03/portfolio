"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { LAYOUT_RESHAPED_EVENT } from "@/lib/scroll/scrollStore";

/**
 * Three.js and the scene are loaded on demand, after the page is interactive:
 * they are never part of the server render or of the initial JavaScript.
 */
const ExperienceCanvas = dynamic(() => import("./ExperienceCanvas"), { ssr: false });

let webglSupported: boolean | undefined;

function detectWebGL(): boolean {
  if (webglSupported === undefined) {
    try {
      const context = document.createElement("canvas").getContext("webgl2");
      webglSupported = context !== null;
      // Release the probe context right away; browsers cap how many can exist.
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webglSupported = false;
    }
  }
  return webglSupported;
}

const subscribe = () => () => {};
/** On the server, and while hydrating, support is not known yet. */
const getServerSnapshot = () => null;

/**
 * Without a scene there is nothing to perform on the transition tracks, so
 * they collapse (see .scene-track in globals.css) and the page reads as a
 * plain document.
 */
function disableScene() {
  const root = document.documentElement;
  const hadTracks = root.dataset.scene !== undefined;
  delete root.dataset.scene;
  delete root.dataset.webgl;
  // Collapsing the tracks moves every section; let the coordinator restore the visitor's place.
  if (hadTracks) window.dispatchEvent(new Event(LAYOUT_RESHAPED_EVENT));
}

/** If the scene fails at any point, drop it and let the HTML carry the page. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    disableScene();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Mounts the WebGL scene when the browser supports it. Without WebGL — or if
 * the scene crashes — nothing is rendered here and the page keeps its static
 * stand-ins: all content and navigation are HTML and keep working.
 */
export function ExperienceCanvasLoader() {
  const supported = useSyncExternalStore<boolean | null>(subscribe, detectWebGL, getServerSnapshot);

  useEffect(() => {
    // Only a definite "no" turns the scene off; `null` means not determined yet.
    if (supported === false) disableScene();
  }, [supported]);

  if (!supported) return null;

  return (
    <div aria-hidden="true" className="experience-canvas">
      <SceneBoundary>
        <ExperienceCanvas />
      </SceneBoundary>
    </div>
  );
}
