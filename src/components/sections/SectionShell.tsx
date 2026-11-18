"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { DepthTitle } from "@/components/ui/DepthTitle";
import { getSectionColor, getSectionEntry, getSectionFace, getSectionIndex, type SectionId } from "@/data/navigation";

interface SectionShellProps {
  id: SectionId;
  eyebrow: string;
  title: string;
  /** Secondary line under the title, e.g. a project's expanded name. */
  subtitle?: string;
  children: ReactNode;
}

/**
 * Shared frame of every section between the hero and the finale: the anchor
 * of the section, its color scope and its heading block.
 *
 * Two elements on purpose. The outer `<section>` is the scroll geometry; the
 * inner `.section` is the content layer. When the scene is running, the
 * content layer of a section the scene leads into is pinned for one screen at
 * its start and revealed in place — through the portal window of its face, or
 * as the cube comes apart (see `.scene-section` in globals.css and
 * portalWindow.ts). A section read inside the open cube (`data-entry="inside"`)
 * is not pinned: it simply follows the one before. Without the scene, all of
 * them are plain blocks.
 */
export function SectionShell({ id, eyebrow, title, subtitle, children }: SectionShellProps) {
  const entry = getSectionEntry(id);
  const face = getSectionFace(id);
  const index = getSectionIndex(id);
  const { faces } = useI18n().dictionary;
  const pinned = entry !== "inside";

  return (
    <section
      id={id}
      data-entry={entry}
      data-face={getSectionColor(id) ?? undefined}
      data-pin={pinned ? "" : undefined}
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      className="scene-section"
    >
      <div className="section">
        {/* Midground: sits between the content and the scene, and drifts at its own pace. */}
        {index > 0 && (
          <span aria-hidden="true" className="section-numeral">
            {String(index).padStart(2, "0")}
          </span>
        )}
        <div className="section-inner">
          <header className="reveal mb-12 md:mb-20">
            <p className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              {index > 0 && <span aria-hidden="true">{String(index).padStart(2, "0")} /</span>}
              {eyebrow}
            </p>
            <DepthTitle id={`${id}-title`}>{title}</DepthTitle>
            {subtitle && <p className="mt-4 font-mono text-sm tracking-wide text-fog-400 md:text-base">{subtitle}</p>}
            {/* A hairline in the section's color, signed with where it lives: on a face of the cube, or inside it. */}
            <div aria-hidden="true" className="section-rule">
              <span className="face-tag">
                <span className="face-tag-swatch" />
                {face ? `${faces.label} / ${faces[face]}` : faces.inside}
              </span>
            </div>
          </header>
          {children}
        </div>
      </div>
    </section>
  );
}
