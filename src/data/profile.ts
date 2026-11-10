import { PENDING, type Localized } from "./content";

export interface InfoBlock {
  label: Localized;
  value: Localized;
}

export interface Profile {
  name: string;
  /** Short professional introduction shown in the hero. */
  intro: Localized;
  /** Technology names for the hero stack summary. */
  stack: string[];
  /** Compact information blocks in the hero's right column. */
  highlights: InfoBlock[];
  about: {
    introduction: Localized;
    approach: Localized;
    interests: Localized;
    objectives: Localized;
  };
  contact: {
    email: string | null;
    github: string | null;
    linkedin: string | null;
  };
  resume: {
    /** Public path of the PDF. */
    href: string;
    /** Set to `true` once the PDF exists at `href`. Until then no link is rendered. */
    available: boolean;
    closingStatement: Localized;
  };
}

/**
 * EDIT ME — every `PENDING`, `null` and empty array below is a placeholder
 * waiting for real content.
 */
export const profile: Profile = {
  name: "Juan F. Valencia",
  intro: PENDING,
  stack: [],
  highlights: [],
  about: {
    introduction: PENDING,
    approach: PENDING,
    interests: PENDING,
    objectives: PENDING,
  },
  contact: {
    email: null,
    github: null,
    linkedin: null,
  },
  resume: {
    href: "/resume.pdf",
    available: false,
    closingStatement: PENDING,
  },
};
