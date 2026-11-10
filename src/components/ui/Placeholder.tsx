"use client";

import { cx } from "@/lib/cx";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface PlaceholderProps {
  /** What is missing, e.g. "Short professional introduction". */
  label: string;
  className?: string;
}

/**
 * The one visual marker for content the site owner has not provided yet.
 * Every instance carries `data-placeholder`, so remaining gaps are easy to
 * find in the DOM and in the codebase.
 */
export function Placeholder({ label, className }: PlaceholderProps) {
  const { dictionary } = useI18n();
  return (
    <span data-placeholder className={cx("placeholder", className)}>
      <span className="placeholder-tag">{dictionary.common.placeholder}</span>
      {label}
    </span>
  );
}
