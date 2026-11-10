import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MathUtils } from "three";
import { getSectionFace } from "@/data/navigation";
import { CUBE, CUBE_EDGE } from "@/lib/rubik/dimensions";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { computeScenePose } from "@/lib/scroll/choreography";
import { scrollStore } from "@/lib/scroll/scrollStore";
import { resolveTimeline } from "@/lib/scroll/timeline";
import { clearPortalWindow, setPortalWindow } from "./portalWindow";
import { CAMERA_FOV, CAMERA_REST_Z, sceneFrame } from "./sceneFrame";

/** Share of the viewport's smaller side that the cube's edge spans on stage. */
const STAGE_FILL = 0.4;
/**
 * At the end of the approach to the panel, the panel must cover the whole
 * view with room to spare, so the window's rounded corners are off screen.
 */
const PANEL_COVER = 0.6;
/** The window sits just inside the panel, leaving a rim of colored glass around it. */
const WINDOW_FIT = 0.93;
/** Distance of the panel's surface from the cube's center, in cube units. */
const PANEL_PLANE = CUBE.spacing + CUBE.coreSize / 2 + CUBE.panelDepth + CUBE.panelBevel;

/**
 * Opacity of the scene while a section is being read. The environment stays
 * present behind the text, but stepped back so it never competes with it.
 */
const READING_DIM = 0.5;

/** How quickly the scene catches up with the scroll position; higher is tighter. */
const SCROLL_DAMPING = 14;
/** A scroll change larger than this many screens in one frame is a jump, not a scroll. */
const JUMP_SCREENS = 1.2;

const TAN_HALF_FOV = Math.tan(MathUtils.degToRad(CAMERA_FOV) / 2);

/**
 * The bridge between scroll and WebGL — and, for the portal, back to the DOM.
 *
 * Once per frame, before anything else in the scene updates, it samples the
 * real scroll position, resolves it against the shared timeline and derives
 * the pose for that position. From the pose and the viewport it works out
 * the camera distance, where the center panel lands on screen, and hands
 * that rectangle to the section's content as its portal window.
 *
 * Nothing is accumulated except a light smoothing of the scroll value
 * itself, which always converges on the real position — so the scene is a
 * function of where the page is, not of how it got there.
 */
export function SceneDirector() {
  const reducedMotion = useReducedMotion();
  const seenJumps = useRef(-1);
  const lastTint = useRef("");

  useEffect(
    () => () => {
      clearPortalWindow();
      document.documentElement.style.removeProperty("--scene-tint");
    },
    [],
  );

  useFrame((state, rawDelta) => {
    const timeline = scrollStore.timeline;
    const { width, height } = state.size;
    const aspect = width / height;

    // --- Stage metrics for this viewport ---------------------------------
    const visibleHeight = 2 * TAN_HALF_FOV * CAMERA_REST_Z;
    const stageScale = (STAGE_FILL * Math.min(visibleHeight, visibleHeight * aspect)) / CUBE_EDGE;
    sceneFrame.stageScale = stageScale;

    sceneFrame.choreographed = timeline !== null && !reducedMotion;
    if (!timeline || reducedMotion) {
      sceneFrame.cameraZ = CAMERA_REST_Z;
      state.gl.domElement.style.opacity = "";
      clearPortalWindow();
      if (lastTint.current !== "") {
        lastTint.current = "";
        document.documentElement.style.removeProperty("--scene-tint");
      }
      return;
    }

    // --- Scroll position ---------------------------------------------------
    const target = window.scrollY;
    const jumped = seenJumps.current !== scrollStore.jumps;
    seenJumps.current = scrollStore.jumps;
    const distance = Math.abs(target - sceneFrame.scroll);
    if (jumped || distance > JUMP_SCREENS * timeline.viewport || distance < 0.05) {
      sceneFrame.scroll = target;
    } else {
      const delta = Math.min(rawDelta, 0.1);
      sceneFrame.scroll += (target - sceneFrame.scroll) * (1 - Math.exp(-SCROLL_DAMPING * delta));
    }

    // --- Timeline → pose -----------------------------------------------------
    const snapshot = resolveTimeline(sceneFrame.snapshot, timeline, sceneFrame.scroll);
    const pose = computeScenePose(sceneFrame.pose, snapshot);

    // --- Camera distance -------------------------------------------------------
    // Distances are measured from the plane of the panels that look at the camera.
    // Interpolating them geometrically makes the face grow at a steady visual rate.
    const panelPlane = PANEL_PLANE * stageScale;
    const panelHalf = (CUBE.panelSize / 2) * stageScale;
    const rest = CAMERA_REST_Z - panelPlane;
    // The face fills the viewport's smaller side; the panel covers its larger one.
    const fill = ((CUBE_EDGE / 2) * stageScale) / (TAN_HALF_FOV * Math.min(1, aspect));
    const arrive = (PANEL_COVER * panelHalf) / (TAN_HALF_FOV * Math.max(1, aspect));
    const toPanel = pose.dolly <= 1 ? rest * Math.pow(fill / rest, pose.dolly) : fill * Math.pow(arrive / fill, pose.dolly - 1);
    // While the Rubik's Cube is not drawn (a section is being read) the camera
    // rests at its normal distance, so the environment behind the text keeps
    // its usual scale instead of looming. The switch happens behind the
    // portal's opaque backdrop.
    sceneFrame.cameraZ = pose.shown ? panelPlane + toPanel : CAMERA_REST_Z;

    // --- Portal window -----------------------------------------------------------
    // Half-size of the center panel as projected on screen, in CSS pixels.
    const panelOnScreen = (panelHalf * height) / (2 * toPanel * TAN_HALF_FOV);
    const radius = panelOnScreen * WINDOW_FIT * pose.iris;
    const corner = radius * (CUBE.panelRadius / (CUBE.panelSize / 2));

    switch (snapshot.state) {
      case "ROTATING":
      case "ALIGNED":
      case "APPROACHING":
        // The destination section may already be under the viewport: keep it shut.
        if (getSectionFace(snapshot.to)) setPortalWindow(snapshot.to, "masked", { radius: 0, corner: 0, glow: 1, veil: 1 });
        else setPortalWindow(null, "open");
        break;
      case "PORTAL_TRANSITION":
        setPortalWindow(snapshot.to, pose.shown ? "masked" : "veiled", { radius, corner, glow: pose.glow, veil: pose.veil });
        break;
      case "EXITING":
        setPortalWindow(snapshot.from, pose.shown ? "masked" : "veiled", { radius, corner, glow: pose.glow, veil: pose.veil });
        break;
      default:
        setPortalWindow(null, "open");
    }

    // --- Environment light (DOM side) ---------------------------------------------
    const tint = pose.tint.toFixed(2);
    if (lastTint.current !== tint) {
      lastTint.current = tint;
      document.documentElement.style.setProperty("--scene-tint", tint);
    }

    // --- Visibility ----------------------------------------------------------------
    // While the Rubik's Cube is not drawn, a section is in charge and only the
    // environment shows: it is dimmed. The switch happens behind the portal's
    // opaque backdrop, so the change itself is never seen.
    const visibility = pose.presence * (pose.shown ? 1 : READING_DIM);
    const opacity = visibility >= 0.999 ? "" : visibility.toFixed(3);
    const canvas = state.gl.domElement;
    if (canvas.style.opacity !== opacity) canvas.style.opacity = opacity;
  }, -1);

  return null;
}
