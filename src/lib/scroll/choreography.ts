import { Quaternion } from "three";
import { getSectionFace, type SectionId } from "../../data/navigation.ts";
import { FACE_ORIENTATIONS, HERO_ORIENTATION } from "../rubik/orientation.ts";
import { easeInOutCubic, easeOutCubic, smoothstep } from "./easing.ts";
import type { ScrollSnapshot } from "./timeline.ts";

/**
 * What the experience should look like for a given scroll snapshot.
 *
 * A pure function: the same snapshot always gives the same pose, so the scene
 * is deterministic and reverses exactly. Every value is continuous across
 * state boundaries (verified in choreography.test.ts) — that is what makes
 * stopping or reversing mid-transition free of jumps.
 *
 * The portal
 * ----------
 * The center panel of the aligned face is the portal. The section's HTML is
 * shown through a window that sits exactly on that panel and follows it as
 * the camera moves in, so the content appears inside the panel and grows
 * until it fills the view. The camera never has to cross geometry: by the
 * time it would, the window already covers the screen. Four values describe
 * the window:
 *
 *   iris   how far the window has opened within the panel (0 shut, 1 the whole panel)
 *   glow   face-colored light filling the window (the panel "igniting")
 *   veil   opaque backdrop behind the content, hiding the scene around it
 *   shown  whether the 3D scene is drawn at all
 */
export interface ScenePose {
  /** Orientation of the cube as a whole, before idle motion. */
  orientation: Quaternion;
  /** 0: the cube sits on its hero anchor. 1: it is centered on the stage. */
  stage: number;
  /** Camera travel. 0: resting distance. 1: the aligned face fills the view. 2: the center panel covers the view. */
  dolly: number;
  /** Opacity of the scene, 0 to 1. */
  presence: number;
  /** How much idle motion (float, sway, pointer) applies, 0 to 1. */
  idle: number;
  /** False once the portal window covers the whole viewport: nothing of the scene can be seen. */
  shown: boolean;
  iris: number;
  glow: number;
  veil: number;
  /** Finale: how far the cube has come apart into its cubies. 0 assembled, 1 fully separated. */
  spread: number;
  /** Strength of the face-colored light in the environment, 0 to 1. */
  tint: number;
  /** Section whose face color the environment light takes. */
  tintSection: SectionId;
}

export function createScenePose(): ScenePose {
  return {
    orientation: HERO_ORIENTATION.clone(),
    stage: 0,
    dolly: 0,
    presence: 1,
    idle: 1,
    shown: true,
    iris: 0,
    glow: 1,
    veil: 1,
    spread: 0,
    tint: 1,
    tintSection: "hero",
  };
}

/**
 * Timing inside PORTAL_TRANSITION, as fractions of its progress.
 * Order matters: the window must cover the viewport (camera arrived) before
 * the scene is dropped, and the scene must be dropped before the veil lifts.
 */
export const PORTAL = {
  /** The window finishes opening within the panel. */
  irisEnd: 0.3,
  /** The face-colored light fades, revealing the content. */
  glow: [0.15, 0.6],
  /** The camera reaches the panel: the window now covers the viewport. */
  arrive: 0.8,
  /** The scene stops being drawn. */
  hideAt: 0.81,
  /** The backdrop lifts, uncovering the environment behind the content. */
  veil: [0.82, 1],
} as const;

/** Timing inside EXITING: the portal in reverse, then the pull back to the resting distance. */
export const EXIT = {
  /** The backdrop returns behind the content. */
  veilEnd: 0.12,
  /** The scene is drawn again, still covered by the window. */
  showAt: 0.12,
  /** The camera backs out until the whole face is in view; the window shrinks with the panel. */
  retreat: [0.12, 0.5],
  /** The face-colored light returns… */
  glow: [0.25, 0.48],
  /** …and the window shuts, leaving the panel solid. */
  iris: [0.36, 0.5],
} as const;

/**
 * Timing inside FINALE, as fractions of its progress: the cube turns back to
 * its three-quarter view, holds for a moment whole and solved, then comes
 * apart while the closing content is revealed.
 */
export const FINALE = {
  turnEnd: 0.38,
  separate: [0.46, 0.9],
} as const;
/** Environment light that lingers while the cube turns between two faces. */
const RESIDUAL_TINT = 0.25;

/** Orientation of the cube when a section is in charge. */
export function orientationOf(section: SectionId): Quaternion {
  const face = getSectionFace(section);
  return face ? FACE_ORIENTATIONS[face] : HERO_ORIENTATION;
}

const span = (range: readonly [number, number], value: number) => (value - range[0]) / (range[1] - range[0]);

export function computeScenePose(out: ScenePose, snapshot: ScrollSnapshot): ScenePose {
  const { state, progress: p, from, to } = snapshot;
  const fromHero = from === "hero";

  // Defaults: the cube centered on stage, aligned with the destination, at rest, window shut.
  out.stage = 1;
  out.dolly = 0;
  out.presence = 1;
  out.idle = 0;
  out.shown = true;
  out.iris = 0;
  out.glow = 1;
  out.veil = 1;
  out.spread = 0;
  out.tint = 0;
  out.tintSection = to;
  out.orientation.copy(orientationOf(to));

  switch (state) {
    case "HERO":
      out.stage = 0;
      out.idle = 1;
      out.tint = 1;
      break;

    case "ROTATING": {
      // Shortest arc between the two orientations, including 180° turns.
      out.orientation.slerpQuaternions(orientationOf(from), orientationOf(to), easeInOutCubic(p));
      // The light of the section just left fades out as the cube turns away from it.
      out.tintSection = from;
      out.tint = (fromHero ? 1 : RESIDUAL_TINT) * (1 - smoothstep(0, 0.6, p));
      if (fromHero) {
        // The cube lets go of its hero slot early, so it holds its place on
        // screen while the hero scrolls away instead of riding up with it.
        out.stage = easeOutCubic(p);
        // Idle motion fades out as the deterministic rotation takes over.
        out.idle = 1 - smoothstep(0, 0.35, p);
      }
      break;
    }

    case "ALIGNED":
      break;

    case "APPROACHING":
      out.dolly = easeInOutCubic(p);
      // The environment takes on the color of the face being approached.
      out.tint = smoothstep(0, 1, p);
      break;

    case "PORTAL_TRANSITION":
      out.dolly = 1 + easeInOutCubic(Math.min(1, p / PORTAL.arrive));
      out.iris = smoothstep(0, PORTAL.irisEnd, p);
      out.glow = 1 - smoothstep(PORTAL.glow[0], PORTAL.glow[1], p);
      out.veil = 1 - smoothstep(PORTAL.veil[0], PORTAL.veil[1], p);
      out.shown = p < PORTAL.hideAt;
      out.tint = 1;
      break;

    case "INSIDE_SECTION":
      out.dolly = 2;
      out.shown = false;
      out.iris = 1;
      out.glow = 0;
      out.veil = 0;
      out.tint = 1;
      break;

    case "EXITING": {
      const retreat = Math.min(1, Math.max(0, span(EXIT.retreat, p)));
      // Out through the panel first, then back to the resting distance.
      out.dolly = p < EXIT.retreat[1] ? 2 - easeInOutCubic(retreat) : 1 - easeInOutCubic(span([EXIT.retreat[1], 1], p));
      out.veil = smoothstep(0, EXIT.veilEnd, p);
      out.shown = p >= EXIT.showAt;
      out.iris = 1 - smoothstep(EXIT.iris[0], EXIT.iris[1], p);
      out.glow = smoothstep(EXIT.glow[0], EXIT.glow[1], p);
      // The section's light dims as the camera pulls away from it.
      out.tint = 1 - (1 - RESIDUAL_TINT) * smoothstep(EXIT.retreat[0], 1, p);
      break;
    }

    case "FINALE":
      out.orientation.slerpQuaternions(orientationOf(from), HERO_ORIENTATION, easeInOutCubic(Math.min(1, p / FINALE.turnEnd)));
      // Linear here: each cubie applies its own easing and delay (lib/rubik/separation.ts).
      out.spread = Math.min(1, Math.max(0, span(FINALE.separate, p)));
      out.tintSection = from;
      out.tint = RESIDUAL_TINT * (1 - smoothstep(0, FINALE.turnEnd, p));
      break;
  }

  return out;
}
