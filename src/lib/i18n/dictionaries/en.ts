import type { SectionId } from "@/data/navigation";
import type { CaseStudyBlock } from "@/data/projects";
import type { SkillCategoryId } from "@/data/skills";

/**
 * English interface copy. This file also defines the `Dictionary` shape that
 * every other locale must match.
 *
 * Only interface copy lives here. Content that belongs to the site owner
 * (bio, project details, skills…) lives in `src/data`.
 * `{name}` is replaced with the owner's name.
 */
const en = {
  meta: {
    role: "Full Stack Developer",
    titles: {
      hero: "Full Stack Developer",
      projects: "Projects",
      skills: "Skills",
      about: "About",
      contact: "Contact",
      distance: "Distance — Case study",
      dodaman: "Dodaman — Case study",
      resume: "Resume",
    } satisfies Record<SectionId, string> as Record<SectionId, string>,
    descriptions: {
      hero: "Portfolio of {name}, Full Stack Developer.",
      projects: "Projects by {name}, Full Stack Developer.",
      skills: "Technical skills of {name}, Full Stack Developer.",
      about: "About {name}, Full Stack Developer.",
      contact: "Get in touch with {name}, Full Stack Developer.",
      distance: "Case study of Distance, a project by {name}.",
      dodaman: "Case study of Dodaman (Document Dashboard Management), a project by {name}.",
      resume: "Resume of {name}, Full Stack Developer.",
    } satisfies Record<SectionId, string> as Record<SectionId, string>,
  },
  common: {
    skipToContent: "Skip to content",
    placeholder: "Placeholder",
    opensInNewTab: "opens in a new tab",
  },
  nav: {
    label: "Main navigation",
    home: "Home",
    menu: "Menu",
    projects: "Projects",
    skills: "Skills",
    about: "About",
    contact: "Contact",
    resume: "Resume",
    language: "Language",
  },
  hero: {
    role: "Full Stack Developer",
    primaryCta: "View projects",
    secondaryCta: "Get in touch",
    scrollHint: "Scroll to explore",
    stackTitle: "Technology stack",
    placeholders: {
      intro: "Short professional introduction",
      stack: "Technology stack summary",
      highlights: "Compact information blocks",
    },
  },
  projects: {
    eyebrow: "Projects",
    title: "Projects",
    technologies: "Technologies",
    status: "Status",
    caseStudyLink: "View case study",
    placeholders: {
      description: "Short description",
      visual: "Visual asset",
      technologies: "Technologies",
      status: "Project status",
    },
  },
  skills: {
    eyebrow: "Skills",
    title: "Skills",
    categories: {
      frontend: "Frontend",
      backend: "Backend",
      databases: "Databases",
      systems: "Systems and tooling",
      ai: "AI-assisted development",
    } satisfies Record<SkillCategoryId, string> as Record<SkillCategoryId, string>,
    placeholders: {
      items: "Technologies for this category",
    },
  },
  about: {
    eyebrow: "About",
    title: "About",
    blocks: {
      introduction: "Personal introduction",
      approach: "Development approach",
      interests: "Technical interests",
      objectives: "Career objectives",
    },
  },
  contact: {
    eyebrow: "Contact",
    title: "Let's build something.",
    email: "Email",
    github: "GitHub",
    linkedin: "LinkedIn",
    placeholders: {
      email: "Email address",
      github: "GitHub profile URL",
      linkedin: "LinkedIn profile URL",
    },
  },
  caseStudy: {
    eyebrow: "Case study",
    blocks: {
      overview: "Overview",
      problem: "Problem",
      approach: "Approach",
      architecture: "Architecture",
      decisions: "Technical decisions",
      challenges: "Challenges",
      results: "Results",
    } satisfies Record<CaseStudyBlock, string> as Record<CaseStudyBlock, string>,
    links: "Links",
    backToProjects: "Back to projects",
    previousProject: "Previous project",
    nextProject: "Next project",
    placeholders: {
      links: "Project links",
    },
  },
  resume: {
    eyebrow: "Resume",
    title: "Resume",
    open: "Open resume",
    unavailable: "Resume PDF not available yet",
    contactLink: "Get in touch",
    placeholders: {
      closingStatement: "Closing statement (optional)",
    },
  },
  notFound: {
    title: "Page not found",
    description: "The page you are looking for does not exist.",
    home: "Back to the portfolio",
  },
};

export type Dictionary = typeof en;

export default en;
