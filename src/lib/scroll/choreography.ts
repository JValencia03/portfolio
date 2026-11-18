import { Quaternion } from "three";
import { getSectionFace, type SectionId } from "../../data/navigation.ts";
import { SCRAMBLED } from "../rubik/opening.ts";
import { FACE_ORIENTATIONS, HERO_ORIENTATION, OPEN_ORIENTATION, turntable } from "../rubik/orientation.ts";
import { clamp01, easeInOutCubic, easeOutCubic, smoothstep } from "./easing.ts";
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
 *   shown  whether the cube is drawn at all
 *
 * The opening
 * -----------
 * The projects are not behind a face: they are inside the cube. To reach
 * them the cube is turned layer by layer and then comes apart, its pieces
 * flying out of the view (`open`, see lib/rubik/opening.ts) while a light
 * blooms where it was (`flare`). Leaving them runs the same thing backward:
 * the pieces return and the cube solves itself.
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
  /** How far the scene has stepped back behind content being read, 0 to 1. Always 1 while the cube is not drawn. */
  dim: number;
  /** How much idle motion (float, sway, pointer) applies, 0 to 1. */
  idle: number;
  /** False while a section is read: the cube is not drawn, only the environment. */
  shown: boolean;
  iris: number;
  glow: number;
  veil: number;
  /** How far the cube has been opened. 0 whole and solved, up to SCRAMBLED its layers turn, 1 its pieces are gone. */
  open: number;
  /** Finale: how far the cube has come apart into its cubies. 0 assembled, 1 fully separated. */
  spread: number;
  /** Light blooming from the middle of the cube, 0 to 1. */
  flare: number;
  /** Strength of the colored light in the environment, 0 to 1. */
  tint: number;
  /** Section whose color the environment light takes. */
  tintSection: SectionId;
}

export function createScenePose(): ScenePose {
  return {
    orientation: HERO_ORIENTATION.clone(),
    stage: 0,
    dolly: 0,
    presence: 1,
    dim: 0,
    idle: 1,
    shown: true,
    iris: 0,
    glow: 1,
    veil: 1,
    open: 0,
    spread: 0,
    flare: 0,
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
 * Timing inside UNLOCKING: the cube leaves the hero for the middle of the
 * stage and its layers start to turn almost at once, so it arrives already
 * in motion. By the end it is scrambled and a first light shows in its seams.
 */
export const UNLOCK = {
  /** The cube reaches the middle of the stage, as the hero finishes scrolling away. */
  settle: 0.5,
  /** Idle motion has handed over to the scroll. */
  idleEnd: 0.2,
  /** The layers turn, one after another. */
  turn: [0.12, 1],
  /** The light inside begins to show. */
  ember: [0.55, 1],
} as const;
/** How bright that first light is: the flare the opening starts from. */
const EMBER = 0.2;

/**
 * Timing inside OPENING, which lasts exactly the screen the revealed content
 * is pinned for: the pieces fly out while the light blooms and fades, and the
 * content comes forward where the cube was (its own reveal is a scroll
 * animation in CSS, on the same screen).
 */
export const OPENING = {
  /** The pieces leave; the last one is out of view by the end. */
  flight: [0, 0.85],
  /** The light is at its brightest, then gone. */
  flarePeak: 0.3,
  flareEnd: 0.85,
  /** The environment steps back behind the content. */
  dim: [0.7, 1],
  /** The light of the revealed section rises. */
  tint: [0.4, 1],
} as const;

/**
 * Timing inside CLOSING, the opening run backward over the screen the last
 * section inside the cube takes to scroll away: the pieces return, the
 * layers turn back, and the cube flashes as it clicks into place, solved.
 */
export const CLOSE = {
  /** The environment comes forward again. */
  dim: [0, 0.3],
  /** The pieces return and the layers turn back. */
  gather: [0.05, 0.85],
  /** The light rises as the last layers turn… */
  flare: [0.45, 0.8],
  /** …and fades once the cube is whole. */
  flareEnd: [0.82, 1],
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

/**
 * Timing inside LOOP: the way from the end back to the start. Over its first
 * half the closing content scrolls away and the pieces gather; the cube
 * flashes as it becomes whole, spins once on itself, and over the second half
 * travels to the slot of the hero rising into view. It ends in exactly the
 * pose the page starts with, which is what lets the scroll go round.
 */
export const LOOP = {
  /** The pieces gather into the cube. */
  gather: [0.04, 0.5],
  /** One full turn on the cube's own axis. */
  spin: [0.28, 0.8],
  /** The light rises as the last pieces arrive… */
  flare: [0.36, 0.5],
  /** …and fades while the cube spins. */
  flareEnd: [0.52, 0.8],
  /** The cube travels from the stage to its slot in the hero. */
  settle: [0.5, 0.97],
  /** Idle motion returns. */
  idle: [0.78, 0.97],
  /** The hero's own light returns. */
  tint: [0.6, 0.97],
} as const;

/** Environment light that lingers while the cube turns between two faces. */
const RESIDUAL_TINT = 0.25;

/** Orientation of the cube when a section is in charge. */
export function orientationOf(section: SectionId): Quaternion {
  const face = getSectionFace(section);
  return face ? FACE_ORIENTATIONS[face] : HERO_ORIENTATION;
}

const span = (range: readonly [number, number], value: number) => (value - range[0]) / (range[1] - range[0]);

/** Orientation of the cube for how far it has been opened: it swings as its layers turn. */
function openOrientation(out: Quaternion, from: SectionId, open: number): Quaternion {
  return out.slerpQuaternions(orientationOf(from), OPEN_ORIENTATION, smoothstep(0, SCRAMBLED, open));
}

export function computeScenePose(out: ScenePose, snapshot: ScrollSnapshot): ScenePose {
  const { state, progress: p, from, to } = snapshot;
  const fromHero = from === "hero";

  // Defaults: the cube centered on stage, whole, aligned with the destination, at rest, window shut.
  out.stage = 1;
  out.dolly = 0;
  out.presence = 1;
  out.dim = 0;
  out.idle = 0;
  out.shown = true;
  out.iris = 0;
  out.glow = 1;
  out.veil = 1;
  out.open = 0;
  out.spread = 0;
  out.flare = 0;
  out.tint = 0;
  out.tintSection = to;
  out.orientation.copy(orientationOf(to));

  switch (state) {
    case "HERO":
      out.stage = 0;
      out.idle = 1;
      out.tint = 1;
      break;

    case "UNLOCKING":
      // Linear here: each move applies its own easing (lib/rubik/opening.ts).
      out.open = SCRAMBLED * clamp01(span(UNLOCK.turn, p));
      openOrientation(out.orientation, from, out.open);
      out.flare = EMBER * smoothstep(UNLOCK.ember[0], UNLOCK.ember[1], p);
      // The light of the section just left fades out as the cube starts to turn.
      out.tintSection = from;
      out.tint = (fromHero ? 1 : RESIDUAL_TINT) * (1 - smoothstep(0, 0.6, p));
      if (fromHero) {
        // The cube lets go of its hero slot early, so it holds its place on
        // screen while the hero scrolls away instead of riding up with it.
        out.stage = easeOutCubic(Math.min(1, p / UNLOCK.settle));
        // Idle motion fades out as the scroll takes over.
        out.idle = 1 - smoothstep(0, UNLOCK.idleEnd, p);
      }
      break;

    case "OPENING":
      // Linear here: each piece applies its own easing and delay.
      out.open = SCRAMBLED + (1 - SCRAMBLED) * clamp01(span(OPENING.flight, p));
      out.orientation.copy(OPEN_ORIENTATION);
      out.flare =
        p < OPENING.flarePeak
          ? EMBER + (1 - EMBER) * smoothstep(0, OPENING.flarePeak, p)
          : 1 - smoothstep(OPENING.flarePeak, OPENING.flareEnd, p);
      out.dim = smoothstep(OPENING.dim[0], OPENING.dim[1], p);
      out.tint = smoothstep(OPENING.tint[0], OPENING.tint[1], p);
      break;

    case "CLOSING":
      out.open = 1 - clamp01(span(CLOSE.gather, p));
      openOrientation(out.orientation, from, out.open);
      out.flare = smoothstep(CLOSE.flare[0], CLOSE.flare[1], p) * (1 - smoothstep(CLOSE.flareEnd[0], CLOSE.flareEnd[1], p));
      out.dim = 1 - smoothstep(CLOSE.dim[0], CLOSE.dim[1], p);
      // The section's light dims as the cube takes the stage back.
      out.tintSection = from;
      out.tint = 1 - (1 - RESIDUAL_TINT) * smoothstep(0, 1, p);
      break;

    case "ROTATING": {
      // Shortest arc between the two orientations, whatever the angle between them.
      out.orientation.slerpQuaternions(orientationOf(from), orientationOf(to), easeInOutCubic(p));
      // The light of the section just left fades out as the cube turns away from it.
      out.tintSection = from;
      out.tint = (fromHero ? 1 : RESIDUAL_TINT) * (1 - smoothstep(0, 0.6, p));
      if (fromHero) {
        out.stage = easeOutCubic(p);
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
      out.shown = false;
      out.iris = 1;
      out.glow = 0;
      out.veil = 0;
      out.tint = 1;
      if (getSectionFace(to)) {
        // Behind a face: the camera is inside its center panel.
        out.dolly = 2;
      } else {
        // Inside the cube: it stays open, its pieces out of view.
        out.open = 1;
        out.orientation.copy(OPEN_ORIENTATION);
      }
      break;

    case "EXITING": {
      const retreat = clamp01(span(EXIT.retreat, p));
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
      out.spread = clamp01(span(FINALE.separate, p));
      out.tintSection = from;
      out.tint = RESIDUAL_TINT * (1 - smoothstep(0, FINALE.turnEnd, p));
      break;

    case "FINALE_HOLD":
      // The cube stays as the finale left it: apart, around the content.
      out.spread = 1;
      break;

    case "LOOP": {
      out.spread = 1 - clamp01(span(LOOP.gather, p));
      const spin = smoothstep(LOOP.spin[0], LOOP.spin[1], p);
      // A full turn ends where it began: past it, the orientation is exactly the hero's.
      if (spin < 1) turntable(out.orientation, spin * 2 * Math.PI);
      out.flare = smoothstep(LOOP.flare[0], LOOP.flare[1], p) * (1 - smoothstep(LOOP.flareEnd[0], LOOP.flareEnd[1], p));
      // The departure from the hero, run backward: the cube joins its slot late,
      // so it keeps its place on screen while the hero rises toward it.
      out.stage = easeOutCubic(1 - clamp01(span(LOOP.settle, p)));
      out.idle = smoothstep(LOOP.idle[0], LOOP.idle[1], p);
      out.tint = smoothstep(LOOP.tint[0], LOOP.tint[1], p);
      break;
    }
  }

  // With the cube out of the picture only the environment is left, stepped back.
  if (!out.shown) out.dim = 1;

  return out;
}
