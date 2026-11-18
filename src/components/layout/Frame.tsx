"use client";

import { useSyncExternalStore } from "react";
import { SECTIONS, type SectionId } from "@/data/navigation";
import { getProject, isProjectSection } from "@/data/projects";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useActiveSection } from "@/lib/navigation/NavigationProvider";
import { scrollStore } from "@/lib/scroll/scrollStore";

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Marginalia on wide screens: where the visitor is (left edge) and how far
 * through the document (right edge). Purely decorative — the navbar already
 * says the same to assistive technology — so it is hidden from it.
 *
 * The percentage has no JavaScript: it is a CSS counter animated by the
 * document's scroll timeline (`.frame-progress` in scroll-animations.css).
 * Once the scroll has gone round, the lap is counted beside it: the page has
 * no end, and says so.
 */
export function Frame() {
  const { dictionary } = useI18n();
  const active = useActiveSection();
  const position = SECTIONS.findIndex((section) => section.id === active);
  const laps = useSyncExternalStore(
    scrollStore.subscribeLaps,
    () => scrollStore.laps,
    () => 0,
  );

  const label = (id: SectionId) => {
    if (id === "hero") return dictionary.nav.home;
    if (isProjectSection(id)) return getProject(id).name;
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
        {laps > 0 && (
          <>
            <span>
              {dictionary.frame.lap} {pad(laps + 1)}
            </span>
            <span className="frame-rule" />
          </>
        )}
        <span>{dictionary.frame.progress}</span>
        <span className="frame-rule" />
        <span className="frame-progress" />
      </p>
    </div>
  );
}
