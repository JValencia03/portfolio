import { PENDING, type Localized } from "./content";
import type { SectionId } from "./navigation";

export const CASE_STUDY_BLOCKS = [
  "overview",
  "problem",
  "approach",
  "architecture",
  "decisions",
  "challenges",
  "results",
] as const;

export type CaseStudyBlock = (typeof CASE_STUDY_BLOCKS)[number];

export interface ProjectLink {
  label: Localized;
  href: string;
}

export interface Project {
  /** Matches the section id of the project's case study. */
  id: Extract<SectionId, "distance" | "dodaman" | "lcdr">;
  /** Project names are never translated. */
  name: string;
  expandedName?: string;
  description: Localized;
  /** Public path of the card's visual asset. */
  image: string | null;
  technologies: string[];
  status: Localized;
  caseStudy: Record<CaseStudyBlock, Localized>;
  links: ProjectLink[];
}

const emptyCaseStudy = (): Record<CaseStudyBlock, Localized> => ({
  overview: PENDING,
  problem: PENDING,
  approach: PENDING,
  architecture: PENDING,
  decisions: PENDING,
  challenges: PENDING,
  results: PENDING,
});

/**
 * EDIT ME — descriptions, technologies, status, case studies and links are
 * placeholders. Nothing here is inferred from the project names.
 */
export const projects: Project[] = [
  {
    id: "distance",
    name: "Distance",
    description: PENDING,
    image: null,
    technologies: [],
    status: PENDING,
    caseStudy: emptyCaseStudy(),
    links: [],
  },
  {
    id: "dodaman",
    name: "Dodaman",
    expandedName: "Document Dashboard Management",
    description: PENDING,
    image: null,
    technologies: [],
    status: PENDING,
    caseStudy: emptyCaseStudy(),
    links: [],
  },
  {
    id: "lcdr",
    name: "LCDR",
    description: PENDING,
    image: null,
    technologies: [],
    status: PENDING,
    caseStudy: emptyCaseStudy(),
    links: [],
  },
];

/** Whether a section is the case study of a project. */
export function isProjectSection(id: SectionId): id is Project["id"] {
  return projects.some((candidate) => candidate.id === id);
}

export function getProject(id: Project["id"]): Project {
  const project = projects.find((candidate) => candidate.id === id);
  if (!project) throw new Error(`Unknown project: ${id}`);
  return project;
}
