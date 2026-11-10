/**
 * Central definition of the experience: sections, their order, their URLs
 * and the Rubik's Cube face each one maps to.
 *
 * The array order IS the narrative scroll order. Reordering entries here
 * reorders the whole experience.
 *
 * Dependency-free on purpose: it is imported by next.config.ts.
 */

export type FaceColor = "yellow" | "blue" | "green" | "white" | "red" | "orange";

/** Physically opposite faces of a standard Rubik's Cube. */
export const OPPOSITE_FACE: Record<FaceColor, FaceColor> = {
  white: "yellow",
  yellow: "white",
  blue: "green",
  green: "blue",
  red: "orange",
  orange: "red",
};

interface SectionDefinition {
  /** Stable identifier. Also used as the DOM id of the section element. */
  id: string;
  /** Path below the locale prefix. `null` means the section has no URL of its own. */
  path: string | null;
  /** Cube face that acts as the portal to this section. */
  face: FaceColor | null;
  /** Whether the section is listed in the navbar. */
  inNavbar: boolean;
  /** Navbar item highlighted while this section is active (defaults to itself). */
  navParent?: string;
}

export const SECTIONS = [
  { id: "hero", path: "", face: null, inNavbar: false },
  { id: "projects", path: "projects", face: "yellow", inNavbar: true },
  { id: "skills", path: "skills", face: "blue", inNavbar: true },
  { id: "about", path: "about", face: "green", inNavbar: true },
  { id: "contact", path: "contact", face: "white", inNavbar: true },
  { id: "distance", path: "projects/distance", face: "red", inNavbar: false, navParent: "projects" },
  { id: "dodaman", path: "projects/dodaman", face: "orange", inNavbar: false, navParent: "projects" },
  { id: "resume", path: null, face: null, inNavbar: false },
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

/** Face of a section, or `null` for sections outside the cube (hero, finale). */
export function getSectionFace(id: SectionId): FaceColor | null {
  return getSection(id).face;
}

/** Navbar item to highlight for a given active section. */
export function getNavItemFor(id: SectionId): SectionId {
  const section: SectionDefinition = getSection(id);
  return (section.navParent as SectionId | undefined) ?? id;
}

/** 1-based position of a face section among the six cube sections. */
export function getFaceIndex(id: SectionId): number {
  return SECTIONS.filter((section) => section.face !== null).findIndex((section) => section.id === id) + 1;
}

/** Locale-less paths of every routed section (used for redirects). */
export const ROUTED_PATHS: string[] = SECTIONS.flatMap((section) => (section.path === null ? [] : [section.path]));
