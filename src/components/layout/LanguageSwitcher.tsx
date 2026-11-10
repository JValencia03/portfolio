"use client";

import Link from "next/link";
import { INITIAL_SECTION } from "@/data/navigation";
import { isModifiedClick } from "@/components/ui/SectionLink";
import { cx } from "@/lib/cx";
import { localeNames, locales } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useActiveSection, useNavigation } from "@/lib/navigation/NavigationProvider";
import { pathFor } from "@/lib/navigation/routes";

/** Compact EN / ES selector. Switching keeps the current section and scene. */
export function LanguageSwitcher() {
  const { locale, dictionary } = useI18n();
  const { switchLocale } = useNavigation();
  const active = useActiveSection();

  return (
    <ul aria-label={dictionary.nav.language} className="flex items-center text-xs font-medium">
      {locales.map((candidate, index) => (
        <li key={candidate} className="flex items-center">
          {index > 0 && (
            <span aria-hidden="true" className="text-ink-500">
              /
            </span>
          )}
          <Link
            href={pathFor(candidate, active) ?? pathFor(candidate, INITIAL_SECTION) ?? "/"}
            prefetch={false}
            hrefLang={candidate}
            lang={candidate}
            aria-label={localeNames[candidate]}
            aria-current={candidate === locale ? "true" : undefined}
            className={cx(
              "flex min-h-11 min-w-11 items-center justify-center px-2 uppercase tracking-widest transition-colors",
              candidate === locale ? "text-fog-100" : "text-fog-400 hover:text-fog-100",
            )}
            onClick={(event) => {
              if (isModifiedClick(event)) return;
              event.preventDefault();
              switchLocale(candidate);
            }}
          >
            {candidate}
          </Link>
        </li>
      ))}
    </ul>
  );
}
