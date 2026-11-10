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
  { id: "frontend", items: [] },
  { id: "backend", items: [] },
  { id: "databases", items: [] },
  { id: "systems", items: [] },
  { id: "ai", items: [] },
];
