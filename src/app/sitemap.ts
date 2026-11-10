import type { MetadataRoute } from "next";
import { SECTIONS, type SectionId } from "@/data/navigation";
import { locales } from "@/lib/i18n/config";
import { pathFor } from "@/lib/navigation/routes";
import { siteUrl } from "@/lib/seo/metadata";

const absolute = (path: string) => new URL(path, siteUrl).href;

/** Every section URL in every language, each pointing at its translations. */
export default function sitemap(): MetadataRoute.Sitemap {
  const routed = SECTIONS.filter((section) => section.path !== null).map((section) => section.id as SectionId);

  return routed.flatMap((id) => {
    const languages = Object.fromEntries(
      locales.flatMap((locale) => {
        const path = pathFor(locale, id);
        return path ? [[locale, absolute(path)]] : [];
      }),
    );
    return locales.flatMap((locale) => {
      const path = pathFor(locale, id);
      return path ? [{ url: absolute(path), alternates: { languages } }] : [];
    });
  });
}
