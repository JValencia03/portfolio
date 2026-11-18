import { createScenePose } from "@/lib/scroll/choreography";
import { createSnapshot } from "@/lib/scroll/timeline";
import { CAMERA_FOV, CAMERA_REST_Z } from "@/lib/three/view";

export { CAMERA_FOV, CAMERA_REST_Z };

/**
 * State of the current frame, shared by every part of the scene.
 *
 * `SceneDirector` writes it once at the start of each frame; the rigs read
 * it. It is a plain mutable object on purpose: per-frame values must never
 * go through React state.
 */
export const sceneFrame = {
  /** Scroll position the scene is showing: `window.scrollY`, lightly smoothed. */
  scroll: 0,
  /**
   * Scroll distance covered in the laps already completed. The document
   * loops, so `scroll` starts again from zero; whatever must keep moving in
   * one direction across the seam (the drift of the background) adds this.
   */
  lapOffset: 0,
  /** Where that position falls in the shared timeline. */
  snapshot: createSnapshot(),
  /** What the scene should look like there. */
  pose: createScenePose(),
  /**
   * False when there is nothing to choreograph: no timeline measured yet, or
   * the visitor prefers reduced motion. The cube then simply rests on its
   * hero anchor.
   */
  choreographed: false,
  /** Uniform scale of the cube when centered on stage. */
  stageScale: 1,
  /** Camera position on the z axis for this frame. */
  cameraZ: CAMERA_REST_Z,
};
