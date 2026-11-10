import type { SectionId } from "@/data/navigation";
import { profile } from "@/data/profile";
import type { Dictionary } from "./dictionaries";

/** Replaces `{token}` occurrences in dictionary strings. */
export function format(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

/**
 * Document title of a section. Shared by server metadata and by the client
 * navigation coordinator so both always produce the same string.
 */
export function pageTitle(dictionary: Dictionary, id: SectionId): string {
  const title = dictionary.meta.titles[id];
  return id === "hero" ? `${profile.name} — ${title}` : `${title} · ${profile.name}`;
}

export function pageDescription(dictionary: Dictionary, id: SectionId): string {
  return format(dictionary.meta.descriptions[id], { name: profile.name });
}
