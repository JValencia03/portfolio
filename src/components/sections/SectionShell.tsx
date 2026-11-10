"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { DepthTitle } from "@/components/ui/DepthTitle";
import { getFaceIndex, getSectionFace, type SectionId } from "@/data/navigation";

interface SectionShellProps {
  id: SectionId;
  eyebrow: string;
  title: string;
  /** Secondary line under the title, e.g. a project's expanded name. */
  subtitle?: string;
  children: ReactNode;
}

/**
 * Shared frame of every cube-face section: the anchor of the section, its
 * face color scope and its heading block.
 *
 * Two elements on purpose. The outer `<section>` is the scroll geometry; the
 * inner `.section` is the content layer. When the scene is running, the
 * content layer is pinned for one screen at the start of the section and
 * shown through the portal window (see `.scene-section` in globals.css and
 * portalWindow.ts). Without the scene, both are plain blocks.
 */
export function SectionShell({ id, eyebrow, title, subtitle, children }: SectionShellProps) {
  const face = getSectionFace(id);
  const index = getFaceIndex(id);
  const { faces } = useI18n().dictionary;

  return (
    <section
      id={id}
      data-face={face ?? undefined}
      data-pin
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
            {/* A hairline in the face color, signed with the face the section lives on. */}
            <div aria-hidden="true" className="section-rule">
              {face && (
                <span className="face-tag">
                  <span className="face-tag-swatch" />
                  {faces.label} / {faces[face]}
                </span>
              )}
            </div>
          </header>
          {children}
        </div>
      </div>
    </section>
  );
}
