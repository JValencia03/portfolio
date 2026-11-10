"use client";

import { Placeholder } from "@/components/ui/Placeholder";
import { skillCategories } from "@/data/skills";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SectionShell } from "./SectionShell";

export function SkillsSection() {
  const { dictionary } = useI18n();
  const copy = dictionary.skills;

  return (
    <SectionShell id="skills" eyebrow={copy.eyebrow} title={copy.title}>
      <ul className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {skillCategories.map((category, index) => (
          <li key={category.id} className="reveal border-t border-white/10 pt-6">
            <p aria-hidden="true" className="font-mono text-xs text-accent">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-2 text-xl font-medium tracking-tight">{copy.categories[category.id]}</h3>
            {category.items.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {category.items.map((item) => (
                  <li key={item} className="chip">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4">
                <Placeholder label={copy.placeholders.items} />
              </p>
            )}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
