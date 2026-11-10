"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import type { SectionId } from "@/data/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useNavigation } from "@/lib/navigation/NavigationProvider";
import { hrefFor } from "@/lib/navigation/routes";

/** Clicks the browser should handle itself: new tab, new window, download… */
export function isModifiedClick(event: MouseEvent): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

interface SectionLinkProps extends Omit<ComponentProps<typeof Link>, "href" | "prefetch"> {
  to: SectionId;
}

/**
 * Link to a section of the experience.
 *
 * It renders a real `<a href>` with the section's canonical URL, so it works
 * without JavaScript, can be opened in a new tab and is crawlable. A plain
 * click is handed to the navigation coordinator instead of the router.
 */
export function SectionLink({ to, onClick, ...props }: SectionLinkProps) {
  const { locale } = useI18n();
  const { navigateTo } = useNavigation();

  return (
    <Link
      {...props}
      href={hrefFor(locale, to)}
      prefetch={false}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || isModifiedClick(event)) return;
        event.preventDefault();
        navigateTo(to);
      }}
    />
  );
}
