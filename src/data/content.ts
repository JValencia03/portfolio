import type { Locale } from "@/lib/i18n/config";

/**
 * Content that only the site owner can provide.
 *
 * `null` (or an empty list) means "not provided yet": the UI renders a clearly
 * marked placeholder instead. Nothing in the data files is ever guessed.
 */
export type Localized<T = string> = Record<Locale, T | null>;

/** A localized value that has not been written yet. */
export const PENDING: Localized<never> = { en: null, es: null };
