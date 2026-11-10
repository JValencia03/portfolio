"use client";

import { SECTIONS, type SectionId } from "@/data/navigation";
import { getProject } from "@/data/projects";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useActiveSection } from "@/lib/navigation/NavigationProvider";

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Marginalia on wide screens: where the visitor is (left edge) and how far
 * through the document (right edge). Purely decorative — the navbar already
 * says the same to assistive technology — so it is hidden from it.
 *
 * The percentage has no JavaScript: it is a CSS counter animated by the
 * document's scroll timeline (`.frame-progress` in scroll-animations.css).
 */
export function Frame() {
  const { dictionary } = useI18n();
  const active = useActiveSection();
  const position = SECTIONS.findIndex((section) => section.id === active);

  const label = (id: SectionId) => {
    if (id === "hero") return dictionary.nav.home;
    if (id === "distance" || id === "dodaman") return getProject(id).name;
    return dictionary.nav[id];
  };

  return (
    <div aria-hidden="true" className="frame">
      <p className="frame-side frame-left">
        <span className="frame-swatch" />
        <span>
          {pad(position)} / {pad(SECTIONS.length - 1)}
        </span>
        <span className="frame-rule" />
        <span>{label(active)}</span>
      </p>
      <p className="frame-side frame-right">
        <span>{dictionary.frame.progress}</span>
        <span className="frame-rule" />
        <span className="frame-progress" />
      </p>
    </div>
  );
}
