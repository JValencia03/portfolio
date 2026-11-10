"use client";

import { ArrowUpRight } from "lucide-react";
import { DepthTitle } from "@/components/ui/DepthTitle";
import { Placeholder } from "@/components/ui/Placeholder";
import { SectionLink } from "@/components/ui/SectionLink";
import { profile } from "@/data/profile";
import { useI18n } from "@/lib/i18n/I18nProvider";

/**
 * Closing section. With the scene running its content is pinned in the
 * middle of the view and revealed while the cube comes apart around it
 * (`.finale-section` in globals.css); without it, it is a plain section.
 */
export function ResumeFinale() {
  const { locale, dictionary } = useI18n();
  const copy = dictionary.resume;
  const { resume } = profile;

  return (
    <section id="resume" data-pin aria-labelledby="resume-title" tabIndex={-1} className="finale-section">
      <div className="section">
        <div className="section-inner flex flex-col items-center justify-center text-center">
          <p className="eyebrow reveal">
            <span className="eyebrow-dot" aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <DepthTitle id="resume-title" className="reveal">
            {copy.title}
          </DepthTitle>
          <p className="reveal mt-6 max-w-xl text-lg leading-relaxed text-fog-300">
            {resume.closingStatement[locale] ?? <Placeholder label={copy.placeholders.closingStatement} />}
          </p>

          <div className="reveal mt-10 flex flex-wrap items-center justify-center gap-4">
            {resume.available ? (
              <a href={resume.href} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                {copy.open}
                <ArrowUpRight aria-hidden="true" className="size-4" />
                <span className="sr-only">({dictionary.common.opensInNewTab})</span>
              </a>
            ) : (
              // No link is rendered until the PDF exists: nothing here can lead to a 404.
              <span data-placeholder className="btn btn-disabled">
                {copy.unavailable}
              </span>
            )}
            <SectionLink to="contact" className="btn btn-ghost">
              {copy.contactLink}
            </SectionLink>
          </div>
        </div>
      </div>
    </section>
  );
}
