import type { Locale } from "../config";
import type { Dictionary } from "./en";

export type { Dictionary };

/**
 * One lazily loaded module per locale. On the server this resolves the
 * dictionary for the requested locale; on the client it lets the language
 * switcher fetch the other locale on demand, as its own chunk.
 */
const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./en").then((module) => module.default),
  es: () => import("./es").then((module) => module.default),
};

export function loadDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]();
}
