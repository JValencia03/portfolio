"use client";

import { Placeholder } from "@/components/ui/Placeholder";
import { profile } from "@/data/profile";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SectionShell } from "./SectionShell";

const SUPPORTING_BLOCKS = ["approach", "interests", "objectives"] as const;

/** Editorial layout: the introduction as a large lead, three supporting columns under it. */
export function AboutSection() {
  const { locale, dictionary } = useI18n();
  const copy = dictionary.about;

  return (
    <SectionShell id="about" eyebrow={copy.eyebrow} title={copy.title}>
      <div className="reveal max-w-4xl">
        <h3 className="block-label">{copy.blocks.introduction}</h3>
        <p className="mt-4 text-2xl leading-snug text-fog-100 md:text-3xl">
          {profile.about.introduction[locale] ?? <Placeholder label={copy.blocks.introduction} />}
        </p>
      </div>

      <div className="mt-16 grid gap-x-12 gap-y-10 border-t border-white/10 pt-10 md:grid-cols-3">
        {SUPPORTING_BLOCKS.map((block) => (
          <div key={block} className="reveal">
            <h3 className="block-label">{copy.blocks[block]}</h3>
            <p className="mt-3 max-w-prose leading-relaxed text-fog-300">
              {profile.about[block][locale] ?? <Placeholder label={copy.blocks[block]} />}
            </p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
