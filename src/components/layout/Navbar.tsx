"use client";

import { ArrowUpRight, Box, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SectionLink } from "@/components/ui/SectionLink";
import { SECTIONS, getNavItemFor, type SectionId } from "@/data/navigation";
import { profile } from "@/data/profile";
import { cx } from "@/lib/cx";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useActiveSection } from "@/lib/navigation/NavigationProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";

type NavItemId = Extract<SectionId, "projects" | "skills" | "about" | "contact">;

const NAV_ITEMS = SECTIONS.filter((section) => section.inNavbar).map((section) => section.id as NavItemId);

const MENU_ID = "nav-menu";

const itemClass =
  "flex min-h-11 items-center gap-1 rounded-full px-3 text-sm whitespace-nowrap transition-colors sm:px-4";
const idleClass = "text-fog-400 hover:text-fog-100";
const activeClass = "bg-white/[0.07] text-fog-100";

interface NavItemsProps {
  /** Called when one of the items is chosen. */
  onSelect?: () => void;
}

/** The section links, shared by the inline list (wide screens) and the menu (narrow ones). */
function NavItems({ onSelect }: NavItemsProps) {
  const { dictionary } = useI18n();
  const active = useActiveSection();
  const activeItem = getNavItemFor(active);

  return (
    <>
      {NAV_ITEMS.map((id) => (
        <li key={id}>
          <SectionLink
            to={id}
            onClick={onSelect}
            aria-current={active === id ? "page" : activeItem === id ? "true" : undefined}
            className={cx(itemClass, activeItem === id ? activeClass : idleClass)}
          >
            {activeItem === id && <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />}
            {dictionary.nav[id]}
          </SectionLink>
        </li>
      ))}
      <li>
        {profile.resume.available ? (
          <a
            href={profile.resume.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onSelect}
            className={cx(itemClass, idleClass)}
          >
            {dictionary.nav.resume}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
            <span className="sr-only">({dictionary.common.opensInNewTab})</span>
          </a>
        ) : (
          // Until the PDF exists, Resume leads to the finale instead of a broken link.
          <SectionLink
            to="resume"
            onClick={onSelect}
            aria-current={active === "resume" ? "true" : undefined}
            className={cx(itemClass, active === "resume" ? activeClass : idleClass)}
          >
            {dictionary.nav.resume}
          </SectionLink>
        )}
      </li>
    </>
  );
}

/**
 * Floating navigation island.
 *
 * Wide screens show every section inline. Narrow ones keep the island
 * compact — home, the current section, the language switch — and open the
 * section list as a menu below it.
 */
export function Navbar() {
  const { dictionary } = useI18n();
  const active = useActiveSection();
  const activeItem = getNavItemFor(active);
  const [menuOpen, setMenuOpen] = useState(false);
  const island = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  // While the menu is open: Escape closes it and returns focus, and so does pressing anywhere else.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButton.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!island.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  // What the menu button says: where the visitor is, or simply "Menu" at the top.
  const currentLabel =
    activeItem === "projects" || activeItem === "skills" || activeItem === "about" || activeItem === "contact"
      ? dictionary.nav[activeItem]
      : active === "resume"
        ? dictionary.nav.resume
        : dictionary.nav.menu;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3 sm:top-5">
      <nav ref={island} aria-label={dictionary.nav.label} className="nav-island pointer-events-auto">
        <SectionLink
          to="hero"
          onClick={() => setMenuOpen(false)}
          aria-label={dictionary.nav.home}
          aria-current={active === "hero" ? "page" : undefined}
          className={cx(itemClass, "px-3 sm:px-3", active === "hero" ? "text-accent" : idleClass)}
        >
          <Box aria-hidden="true" className="size-4" />
        </SectionLink>

        {/* Wide screens: every section inline. */}
        <ul className="hidden items-center sm:flex">
          <NavItems />
        </ul>

        {/* Narrow screens: the current section, as the button that opens the menu. */}
        <button
          ref={menuButton}
          type="button"
          aria-expanded={menuOpen}
          aria-controls={MENU_ID}
          onClick={() => setMenuOpen((open) => !open)}
          className={cx(itemClass, "sm:hidden", active === "hero" ? idleClass : activeClass)}
        >
          {active !== "hero" && <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />}
          {currentLabel}
          <ChevronDown aria-hidden="true" className={cx("size-4 transition-transform", menuOpen && "rotate-180")} />
        </button>

        <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-white/10" />
        <LanguageSwitcher />

        {menuOpen && (
          <ul id={MENU_ID} className="nav-menu sm:hidden">
            <NavItems onSelect={() => setMenuOpen(false)} />
          </ul>
        )}
      </nav>
    </header>
  );
}
