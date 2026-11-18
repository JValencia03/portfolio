/**
 * Central definition of the experience: sections, their order, their URLs,
 * how each one is reached and the cube color it wears.
 *
 * The array order IS the narrative scroll order. Reordering entries here
 * reorders the whole experience.
 *
 * Dependency-free on purpose: it is imported by next.config.ts.
 */

export type FaceColor = "yellow" | "blue" | "green" | "white" | "red" | "orange";

/** A cube has three pairs of opposite faces; sections on opposite faces are a 180° turn apart. */
export const OPPOSITE_FACE: Record<FaceColor, FaceColor> = {
  yellow: "white",
  white: "yellow",
  blue: "green",
  green: "blue",
  red: "orange",
  orange: "red",
};

/**
 * How a section is reached from the one before it.
 *
 *   start    the hero: where the scroll begins, the cube whole and at rest
 *   opening  the cube comes apart and what was inside it is revealed
 *   inside   follows directly, while the cube is still open
 *   portal   through the face of the cube that has the section's color
 *   finale   the closing section: the cube comes apart around its content
 */
export type SectionEntry = "start" | "opening" | "inside" | "portal" | "finale";

interface SectionDefinition {
  /** Stable identifier. Also used as the DOM id of the section element. */
  id: string;
  /** Path below the locale prefix. `null` means the section has no URL of its own. */
  path: string | null;
  entry: SectionEntry;
  /**
   * Cube color the section wears. For a `portal` section it is also the face
   * that leads to it; the three projects wear the three faces left over.
   */
  color: FaceColor | null;
  /** Whether the section is listed in the navbar. */
  inNavbar: boolean;
  /** Navbar item highlighted while this section is active (defaults to itself). */
  navParent?: string;
}

export const SECTIONS = [
  { id: "hero", path: "", entry: "start", color: null, inNavbar: false },
  { id: "projects", path: "projects", entry: "opening", color: null, inNavbar: true },
  { id: "distance", path: "projects/distance", entry: "inside", color: "red", inNavbar: false, navParent: "projects" },
  { id: "dodaman", path: "projects/dodaman", entry: "inside", color: "orange", inNavbar: false, navParent: "projects" },
  { id: "lcdr", path: "projects/lcdr", entry: "inside", color: "yellow", inNavbar: false, navParent: "projects" },
  { id: "skills", path: "skills", entry: "portal", color: "blue", inNavbar: true },
  { id: "about", path: "about", entry: "portal", color: "green", inNavbar: true },
  { id: "contact", path: "contact", entry: "portal", color: "white", inNavbar: true },
  { id: "resume", path: null, entry: "finale", color: null, inNavbar: false },
] as const satisfies readonly SectionDefinition[];

export type Section = (typeof SECTIONS)[number];
export type SectionId = Section["id"];
/** Sections that own a URL. */
export type RoutedSectionId = Exclude<SectionId, "resume">;

export const INITIAL_SECTION: SectionId = "hero";

export function getSection(id: SectionId): Section {
  const section = SECTIONS.find((candidate) => candidate.id === id);
  if (!section) throw new Error(`Unknown section: ${id}`);
  return section;
}

export function getSectionEntry(id: SectionId): SectionEntry {
  return getSection(id).entry;
}

/** Cube color a section wears, or `null` for the neutral ones (hero, projects, finale). */
export function getSectionColor(id: SectionId): FaceColor | null {
  return getSection(id).color;
}

/** Face of the cube that is the portal to a section, or `null` when it is not reached through one. */
export function getSectionFace(id: SectionId): FaceColor | null {
  const section: SectionDefinition = getSection(id);
  return section.entry === "portal" ? section.color : null;
}

/** Navbar item to highlight for a given active section. */
export function getNavItemFor(id: SectionId): SectionId {
  const section: SectionDefinition = getSection(id);
  return (section.navParent as SectionId | undefined) ?? id;
}

/** 1-based position of a section among those between the hero and the finale; 0 for those two. */
export function getSectionIndex(id: SectionId): number {
  const section: SectionDefinition = getSection(id);
  if (section.entry === "start" || section.entry === "finale") return 0;
  return SECTIONS.findIndex((candidate) => candidate.id === id);
}

/** Locale-less paths of every routed section (used for redirects). */
export const ROUTED_PATHS: string[] = SECTIONS.flatMap((section) => (section.path === null ? [] : [section.path]));
