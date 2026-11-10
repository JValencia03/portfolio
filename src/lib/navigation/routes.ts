import { SECTIONS, getSection, type SectionId } from "../../data/navigation";
import { hasLocale, type Locale } from "../i18n/config";

/** Canonical path of a section, or `null` when the section has no URL. */
export function pathFor(locale: Locale, id: SectionId): string | null {
  const { path } = getSection(id);
  if (path === null) return null;
  return path === "" ? `/${locale}` : `/${locale}/${path}`;
}

/** Link target for a section: its path, or an in-page anchor when it has no URL. */
export function hrefFor(locale: Locale, id: SectionId): string {
  return pathFor(locale, id) ?? `#${id}`;
}

export interface ParsedPath {
  locale: Locale;
  section: SectionId;
}

/** Resolves a pathname such as `/es/projects/distance` to its locale and section. */
export function parsePath(pathname: string): ParsedPath | null {
  const [locale, ...rest] = pathname.split("/").filter(Boolean);
  if (!hasLocale(locale)) return null;
  const path = rest.join("/");
  const section = SECTIONS.find((candidate) => candidate.path === path);
  return section ? { locale, section: section.id } : null;
}
