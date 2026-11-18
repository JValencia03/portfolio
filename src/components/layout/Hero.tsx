"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";
import { HeroName } from "@/components/ui/HeroName";
import { Placeholder } from "@/components/ui/Placeholder";
import { SectionLink } from "@/components/ui/SectionLink";
import { profile } from "@/data/profile";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** When an element joins the entrance, after the name has started to rise. */
const delay = (ms: number) => ({ "--enter-delay": `${ms}ms` }) as CSSProperties;

/**
 * Hero. Desktop: identity | cube | stack. Mobile: identity, cube, primary
 * CTA, stack — the order is driven by grid areas in globals.css.
 *
 * It is rendered a second time at the very end of the document, as a
 * `replica`: an inert copy that the scroll arrives at before continuing from
 * the top, where the real one stands in exactly the same place (see LoopSeam).
 * The copy has no ids and is hidden from assistive technology.
 */
export function Hero({ replica = false }: { replica?: boolean }) {
  const { locale, dictionary } = useI18n();
  const copy = dictionary.hero;
  const intro = profile.intro[locale];
  const titleId = replica ? "hero-replica-title" : "hero-title";
  const stackTitleId = replica ? "hero-replica-stack-title" : "hero-stack-title";

  return (
    <section
      id={replica ? undefined : "hero"}
      data-replica={replica ? "" : undefined}
      aria-labelledby={titleId}
      tabIndex={replica ? undefined : -1}
      className="section hero"
    >
      <div className="section-inner hero-grid">
        <div className="hero-identity">
          <p className="eyebrow enter">
            <span className="eyebrow-dot" aria-hidden="true" />
            {copy.role}
          </p>
          <HeroName id={titleId} name={profile.name} />
          <p className="enter mt-6 max-w-md text-lg leading-relaxed text-fog-300" style={delay(700)}>
            {intro ?? <Placeholder label={copy.placeholders.intro} />}
          </p>
        </div>

        {/*
          The WebGL cube is drawn on the shared canvas, positioned over this element
          (see CubeRig). The flat grid is the stand-in shown until the scene is ready,
          and the permanent fallback when WebGL is unavailable.
        */}
        <div className="hero-cube">
          <div aria-hidden="true" data-cube-anchor data-replica={replica ? "" : undefined} className="cube-slot">
            {Array.from({ length: 9 }, (_, cell) => (
              <span key={cell} />
            ))}
          </div>
          <p className="scroll-cue mt-8 flex items-center justify-center gap-2 font-mono text-xs tracking-widest text-fog-400 uppercase">
            <ArrowDown aria-hidden="true" className="size-3.5" />
            {copy.scrollHint}
          </p>
        </div>

        <div className="hero-cta">
          <SectionLink to="projects" className="btn btn-primary enter" style={delay(850)}>
            {copy.primaryCta}
            <ArrowRight aria-hidden="true" className="size-4" />
          </SectionLink>
        </div>

        <aside className="hero-stack" aria-labelledby={stackTitleId}>
          <div className="enter" style={delay(950)}>
          <h2 id={stackTitleId} className="block-label">
            {copy.stackTitle}
          </h2>
          {profile.stack.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {profile.stack.map((technology) => (
                <li key={technology} className="chip">
                  {technology}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4">
              <Placeholder label={copy.placeholders.stack} />
            </p>
          )}

          {profile.highlights.length > 0 ? (
            <dl className="mt-8 grid grid-cols-2 gap-6">
              {profile.highlights.map((block, index) => (
                <div key={index}>
                  <dt className="block-label">{block.label[locale]}</dt>
                  <dd className="mt-1 text-fog-100">{block.value[locale]}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-8">
              <Placeholder label={copy.placeholders.highlights} />
            </p>
          )}

          <SectionLink to="contact" className="btn btn-ghost mt-8">
            {copy.secondaryCta}
          </SectionLink>
          </div>
        </aside>
      </div>
    </section>
  );
}
