/**
 * Locale configuration. Dependency-free on purpose: it is imported by
 * next.config.ts, server code and client code alike.
 */
export const locales = ["en", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Autonyms: each language named in itself, never translated. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

/** Open Graph locale codes. */
export const ogLocales: Record<Locale, string> = {
  en: "en_US",
  es: "es_ES",
};

export function hasLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}
