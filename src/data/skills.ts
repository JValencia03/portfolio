export const SKILL_CATEGORY_IDS = ["frontend", "backend", "databases", "systems", "ai"] as const;

export type SkillCategoryId = (typeof SKILL_CATEGORY_IDS)[number];

export interface SkillCategory {
  /** Category titles are translated in the dictionaries under `skills.categories`. */
  id: SkillCategoryId;
  /** Technology names. Empty means "not provided yet". */
  items: string[];
}

/**
 * EDIT ME — add, remove or reorder categories and fill in `items`.
 * A new category id also needs a title in both dictionaries.
 */
export const skillCategories: SkillCategory[] = [
  { id: "frontend", items: ["HTML", "CSS", "TypeScript", "React", "Next.js", "Astro", "Tailwind", "Redux", "Zustand"] },
  { id: "backend", items: ["Go", "Node.js", "Express", "Python", "FastAPI", "REST APIs", "Auth & roles", "Rust (learning)"] },
  { id: "databases", items: ["PostgreSQL", "SQLite", "Prisma", "SQLAlchemy"] },
  { id: "systems", items: ["Docker", "Linux", "WSL2", "Git", "GitHub", "Cloudflare", "Figma"] },
  { id: "ai", items: ["AI coding agents", "Multi-agent workflows", "OpenCode", "Gentle AI", "Prompt & context engineering", "SDD / ODD", "llama.cpp", "Local RAG"] },
];
