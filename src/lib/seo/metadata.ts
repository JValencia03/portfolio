import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import type { RoutedSectionId } from "@/data/navigation";
import { profile } from "@/data/profile";
import { defaultLocale, hasLocale, locales, ogLocales } from "@/lib/i18n/config";
import { loadDictionary } from "@/lib/i18n/dictionaries";
import { pageDescription, pageTitle } from "@/lib/i18n/format";
import { pathFor } from "@/lib/navigation/routes";

/**
 * Public origin of the site, used to resolve canonical and Open Graph URLs.
 * Set NEXT_PUBLIC_SITE_URL in production; on Vercel the production domain is
 * picked up automatically.
 */
export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
);

/** Builds the `generateMetadata` export of a section's entry page. */
export function createSectionMetadata(id: RoutedSectionId) {
  return async function generateMetadata(): Promise<Metadata> {
    const locale = await rootLocale();
    if (!hasLocale(locale)) return {};

    const dictionary = await loadDictionary(locale);
    const title = pageTitle(dictionary, id);
    const description = pageDescription(dictionary, id);
    const canonical = pathFor(locale, id) ?? `/${locale}`;

    return {
      title,
      description,
      alternates: {
        canonical,
        languages: {
          ...Object.fromEntries(locales.map((candidate) => [candidate, pathFor(candidate, id)])),
          "x-default": pathFor(defaultLocale, id),
        },
      },
      openGraph: {
        type: "website",
        title,
        description,
        url: canonical,
        siteName: profile.name,
        locale: ogLocales[locale],
        alternateLocale: locales.filter((candidate) => candidate !== locale).map((candidate) => ogLocales[candidate]),
      },
    };
  };
}
