"use client";

import type { CSSProperties } from "react";
import { getSectionColor, getSectionIndex, type SectionId } from "@/data/navigation";
import { getProject, isProjectSection } from "@/data/projects";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { STAGE_SCREENS, TRACK_SCREENS, type TrackKind } from "@/lib/scroll/phases";

const { rotate, aligned, approach } = STAGE_SCREENS;

/**
 * When the caption fades in and out, as percentages of the track's `cover`
 * range — from the moment the track enters the viewport to the moment it has
 * left, which is one screen plus the track's own height. The first of those
 * screens is the previous section scrolling out.
 *
 * Toward a face, the caption appears as the rotation completes and leaves
 * early in the approach, before the growing face reaches it. Toward the
 * projects, it appears once the cube is on stage with its layers turning and
 * leaves before the pieces fly.
 * Derived from the same stage configuration as the scroll timeline.
 */
function captionRange(kind: "opening" | "portal") {
  const track = TRACK_SCREENS[kind];
  const total = 1 + track;
  const percent = (screens: number) => `${((screens / total) * 100).toFixed(2)}%`;
  const [inStart, inEnd, outStart, outEnd] =
    kind === "opening"
      ? [0.8, 1.1, 1 + track * 0.64, 1 + track * 0.9]
      : [1 + rotate * 0.6, 1 + rotate, 1 + rotate + aligned + approach * 0.1, 1 + rotate + aligned + approach * 0.5];
  return {
    "--caption-in-start": percent(inStart),
    "--caption-in-end": percent(inEnd),
    "--caption-out-start": percent(outStart),
    "--caption-out-end": percent(outEnd),
  };
}

interface TransitionTrackProps {
  /** Section this track leads to. */
  to: SectionId;
  kind: TrackKind;
}

/**
 * The empty scroll distance before a section: the stage on which the scene
 * performs a transition.
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
  const captioned = kind === "opening" || kind === "portal";

  const label = isProjectSection(to)
    ? getProject(to).name
    : to === "projects" || to === "skills" || to === "about" || to === "contact"
      ? dictionary.nav[to]
      : null;

  const style = {
    "--track-screens": TRACK_SCREENS[kind],
    ...(captioned ? captionRange(kind) : {}),
  } as CSSProperties;

  return (
    <div aria-hidden="true" className="scene-track" data-track={to} data-face={getSectionColor(to) ?? undefined} style={style}>
      {label && captioned && (
        // Two nested elements: one fades in, the other fades out, each on its own range.
        <p className="track-caption">
          <span className="track-caption-body">
            <span className="eyebrow-dot" />
            <span>{String(getSectionIndex(to)).padStart(2, "0")}</span>
            <span className="track-caption-rule" />
            <span>{label}</span>
          </span>
        </p>
      )}
    </div>
  );
}
