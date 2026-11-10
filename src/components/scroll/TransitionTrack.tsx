"use client";

import type { CSSProperties } from "react";
import { getFaceIndex, getSectionFace, type SectionId } from "@/data/navigation";
import { getProject } from "@/data/projects";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { STAGE_SCREENS, TRACK_SCREENS, type TrackKind } from "@/lib/scroll/phases";

const { heroHold, rotate, aligned, approach } = STAGE_SCREENS;

/**
 * When the caption fades in and out, as percentages of the track's `cover`
 * range — from the moment the track enters the viewport to the moment it has
 * left, which is one screen plus the track's own height. The caption appears
 * as the rotation completes and leaves early in the approach, before the
 * growing face reaches it.
 * Derived from the same stage configuration as the scroll timeline.
 */
function captionRange(kind: Exclude<TrackKind, "finale">) {
  // Screens from the start of the cover range to the start of the rotation.
  const lead = kind === "fromHero" ? heroHold : 1;
  const total = 1 + TRACK_SCREENS[kind];
  const percent = (screens: number) => `${((screens / total) * 100).toFixed(2)}%`;
  return {
    "--caption-in-start": percent(lead + rotate * 0.6),
    "--caption-in-end": percent(lead + rotate),
    "--caption-out-start": percent(lead + rotate + aligned + approach * 0.1),
    "--caption-out-end": percent(lead + rotate + aligned + approach * 0.5),
  };
}

interface TransitionTrackProps {
  /** Section this track leads to. */
  to: SectionId;
  kind: TrackKind;
}

/**
 * The empty scroll distance between two sections: the stage on which the
 * scene performs a transition.
 *
 * It contributes nothing but height. That height is real document scroll, so
 * the browser's own scrolling drives everything — no wheel handling. The
 * element is also the subject of a named CSS view timeline (`--track`), the
 * same geometry the scene reads, which keeps HTML and WebGL in step: the
 * caption announcing the destination is animated by that timeline alone.
 *
 * Without a scene (no WebGL, reduced motion, no JavaScript) the track
 * collapses to nothing in CSS and the page is a plain document.
 */
export function TransitionTrack({ to, kind }: TransitionTrackProps) {
  const { dictionary } = useI18n();
  const face = getSectionFace(to);

  const label =
    to === "distance" || to === "dodaman"
      ? getProject(to).name
      : to === "projects" || to === "skills" || to === "about" || to === "contact"
        ? dictionary.nav[to]
        : null;

  const style = {
    "--track-screens": TRACK_SCREENS[kind],
    ...(kind === "finale" ? {} : captionRange(kind)),
  } as CSSProperties;

  return (
    <div aria-hidden="true" className="scene-track" data-track={to} data-face={face ?? undefined} style={style}>
      {label && kind !== "finale" && (
        // Two nested elements: one fades in, the other fades out, each on its own range.
        <p className="track-caption">
          <span className="track-caption-body">
            <span className="eyebrow-dot" />
            <span>{String(getFaceIndex(to)).padStart(2, "0")}</span>
            <span className="track-caption-rule" />
            <span>{label}</span>
          </span>
        </p>
      )}
    </div>
  );
}
