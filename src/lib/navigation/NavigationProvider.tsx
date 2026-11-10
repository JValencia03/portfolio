"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { INITIAL_SECTION, getSectionFace, type SectionId } from "@/data/navigation";
import type { Locale } from "@/lib/i18n/config";
import { pageTitle } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { easeInOutCubic } from "@/lib/scroll/easing";
import { LAYOUT_RESHAPED_EVENT, scrollStore } from "@/lib/scroll/scrollStore";
import { activeSectionOf, createSnapshot, resolveTimeline } from "@/lib/scroll/timeline";
import { parsePath, pathFor } from "./routes";

/**
 * Navigation coordinator.
 *
 * The portfolio is one continuous document; every section URL is an entry
 * point into it. This provider is the single place that keeps four things in
 * agreement: the active section, the scroll position, the URL and the
 * language.
 *
 * - The URL is the source of truth for locale + destination.
 * - The active section comes from the shared scroll timeline — the same model
 *   that drives the 3D scene — so the two can never disagree.
 * - Scrolling into a section rewrites the URL with `replaceState`, so reading
 *   the page never floods the history.
 * - Explicit navigation uses `pushState`, so Back and Forward retrace the
 *   links the visitor actually followed. It never scrolls through what lies
 *   between: the page dims, cuts to the destination's own face, and travels
 *   through that one portal.
 * - While such a move is in flight, scroll-driven updates are ignored. That
 *   is what prevents feedback loops between the two.
 *
 * Next.js' router is deliberately bypassed for in-experience navigation: the
 * native History API keeps the layout and the WebGL canvas mounted.
 */

/** How long the page takes to dim before a cut. Matches the transition in globals.css. */
const CURTAIN_MS = 170;
/** How long the travel from an aligned face through its portal takes. */
const TRAVEL_MS = 1300;
/** Input that means the visitor is taking over the scroll. */
const TAKEOVER_EVENTS = ["wheel", "touchstart", "keydown"] as const;

type Listener = () => void;

interface SectionStore {
  get: () => SectionId;
  set: (next: SectionId) => void;
  subscribe: (listener: Listener) => () => void;
}

function createSectionStore(initial: SectionId): SectionStore {
  let current = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => current,
    set(next) {
      if (next === current) return;
      current = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Whether the cinematic layout (tracks, pins, portal) is in effect. */
const sceneIsRunning = () => document.documentElement.dataset.scene === "on" && !prefersReducedMotion();

const scrollToPosition = (top: number) => window.scrollTo({ top, behavior: "instant" });

interface NavigationValue {
  store: SectionStore;
  /** Explicit navigation: adds a history entry and goes to the section. */
  navigateTo: (id: SectionId) => void;
  /** Changes the language in place, keeping the current destination. */
  switchLocale: (locale: Locale) => void;
}

const NavigationContext = createContext<NavigationValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const { setLocale } = useI18n();
  const [store] = useState(() => createSectionStore(INITIAL_SECTION));
  /** True while a programmatic move (cut or travel) is in flight. */
  const moving = useRef(false);
  const curtainTimer = useRef(0);
  const travelFrame = useRef(0);
  const stopWatchingTakeover = useRef<(() => void) | null>(null);
  /** Reused for every lookup, so scrolling allocates nothing. */
  const snapshot = useRef(createSnapshot());

  /** Scroll position → active section → URL. */
  const syncFromScroll = useCallback(() => {
    const timeline = scrollStore.timeline;
    if (!timeline || moving.current) return;

    const id = activeSectionOf(resolveTimeline(snapshot.current, timeline, window.scrollY));
    store.set(id);
    const current = parsePath(window.location.pathname);
    if (!current) return;
    const href = pathFor(current.locale, id);
    // Sections without a URL (the finale) leave the address untouched.
    if (href && href !== window.location.pathname) window.history.replaceState(null, "", href);
  }, [store]);

  /** Stops whatever programmatic move is in flight, wherever it is. */
  const cancelMove = useCallback(() => {
    window.clearTimeout(curtainTimer.current);
    cancelAnimationFrame(travelFrame.current);
    stopWatchingTakeover.current?.();
    stopWatchingTakeover.current = null;
  }, []);

  /** Lands exactly on a section — content at the top, fully revealed — in a single step. */
  const land = useCallback(
    (id: SectionId) => {
      cancelMove();
      const anchor = scrollStore.anchorOf(id);
      if (anchor !== null) scrollToPosition(anchor);
      // Tell the scene this was a cut, not a scroll to ease through.
      scrollStore.notifyJump();
      moving.current = false;
      delete document.documentElement.dataset.navigating;
      syncFromScroll();
    },
    [cancelMove, syncFromScroll],
  );

  /** Cuts to a section: the page dims, the document jumps, the page returns. */
  const jumpTo = useCallback(
    (id: SectionId) => {
      cancelMove();
      store.set(id);

      if (prefersReducedMotion()) {
        land(id);
        return;
      }
      moving.current = true;
      document.documentElement.dataset.navigating = "";
      curtainTimer.current = window.setTimeout(() => land(id), CURTAIN_MS);
    },
    [store, cancelMove, land],
  );

  /**
   * Targeted navigation. Instead of scrolling through every section on the
   * way, the page dims, cuts to the destination's own face already aligned,
   * and then travels through that single portal — the same scroll-driven
   * transition, played over a short stretch of real scroll. Any scroll input
   * from the visitor hands control straight back to them.
   */
  const travelTo = useCallback(
    (id: SectionId) => {
      const anchor = scrollStore.anchorOf(id);
      const aligned = scrollStore.timeline?.segments.find(
        (segment) => segment.state === "ALIGNED" && segment.to === id && segment.end > segment.start,
      );
      // No portal to travel through (hero, finale, or no scene): a plain cut.
      if (!aligned || anchor === null || !sceneIsRunning()) {
        jumpTo(id);
        return;
      }

      cancelMove();
      store.set(id);
      moving.current = true;
      document.documentElement.dataset.navigating = "";

      curtainTimer.current = window.setTimeout(() => {
        const from = aligned.start;
        const distance = anchor - from;
        scrollToPosition(from);
        scrollStore.notifyJump();
        delete document.documentElement.dataset.navigating;

        const takeOver = () => {
          cancelMove();
          moving.current = false;
          syncFromScroll();
        };
        for (const type of TAKEOVER_EVENTS) window.addEventListener(type, takeOver, { passive: true });
        stopWatchingTakeover.current = () => {
          for (const type of TAKEOVER_EVENTS) window.removeEventListener(type, takeOver);
        };

        const startedAt = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - startedAt) / TRAVEL_MS);
          if (t >= 1) {
            land(id);
            return;
          }
          scrollToPosition(from + distance * easeInOutCubic(t));
          travelFrame.current = requestAnimationFrame(step);
        };
        travelFrame.current = requestAnimationFrame(step);
      }, CURTAIN_MS);
    },
    [store, cancelMove, jumpTo, land, syncFromScroll],
  );

  const navigateTo = useCallback(
    (id: SectionId) => {
      const current = parsePath(window.location.pathname);
      const href = current ? pathFor(current.locale, id) : null;
      if (href && href !== window.location.pathname) window.history.pushState(null, "", href);
      travelTo(id);
      // Move keyboard and screen reader focus to the destination.
      document.getElementById(id)?.focus({ preventScroll: true });
    },
    [travelTo],
  );

  const switchLocale = useCallback(
    (next: Locale) => {
      const current = parsePath(window.location.pathname);
      void setLocale(next).then(() => {
        const href = pathFor(next, current?.section ?? INITIAL_SECTION);
        if (href && href !== window.location.pathname) window.history.replaceState(null, "", href);
      });
    },
    [setLocale],
  );

  useEffect(() => {
    // Positions are derived from the URL, never from the browser's own memory.
    window.history.scrollRestoration = "manual";

    const stopMeasuring = scrollStore.start();

    // Direct access: an inline script already jumped to the destination before
    // first paint; re-align in case late layout shifts moved it.
    const initial = parsePath(window.location.pathname);
    if (initial) {
      const anchor = scrollStore.anchorOf(initial.section);
      if (initial.section !== INITIAL_SECTION && anchor !== null) scrollToPosition(anchor);
      store.set(initial.section);
    }

    // One timeline lookup per frame at most, however many scroll events fire.
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        syncFromScroll();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // A re-measured layout can change which section a scroll position falls in.
    const unsubscribe = scrollStore.subscribe(onScroll);
    onScroll();

    const onPopState = () => {
      const destination = parsePath(window.location.pathname);
      if (!destination) return;
      void setLocale(destination.locale).then(() => jumpTo(destination.section));
    };
    window.addEventListener("popstate", onPopState);

    // The layout changed shape under the visitor: go back to where the URL says they are.
    const onReshaped = () => {
      scrollStore.measure();
      land(parsePath(window.location.pathname)?.section ?? store.get());
    };
    window.addEventListener(LAYOUT_RESHAPED_EVENT, onReshaped);

    /**
     * Keyboard focus must never rest on something the portal is hiding. When
     * focus moves into a section that is not currently readable (the browser
     * scrolled it into view mid-transition), enter that section properly.
     */
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      const timeline = scrollStore.timeline;
      if (!(target instanceof HTMLElement) || !timeline || moving.current || !sceneIsRunning()) return;
      if (!target.matches(":focus-visible")) return;
      const section = target.closest<HTMLElement>("[data-pin]");
      if (!section) return;

      const id = section.id as SectionId;
      const now = resolveTimeline(snapshot.current, timeline, window.scrollY);
      const readable =
        (now.state === "INSIDE_SECTION" && now.to === id) ||
        (now.state === "EXITING" && now.from === id && now.progress < 0.2) ||
        // The finale's content is only fully revealed near the very end.
        (now.state === "FINALE" && now.to === id && now.progress > 0.9);
      if (readable) return;

      land(id);
      if (target !== section) target.scrollIntoView({ behavior: "instant", block: "nearest" });
    };
    document.addEventListener("focusin", onFocusIn);

    return () => {
      stopMeasuring();
      unsubscribe();
      cancelAnimationFrame(frame);
      cancelMove();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener(LAYOUT_RESHAPED_EVENT, onReshaped);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [store, syncFromScroll, cancelMove, jumpTo, land, setLocale]);

  const value = useMemo<NavigationValue>(
    () => ({ store, navigateTo, switchLocale }),
    [store, navigateTo, switchLocale],
  );

  return (
    <NavigationContext value={value}>
      <DocumentSync />
      {children}
    </NavigationContext>
  );
}

export function useNavigation(): NavigationValue {
  const value = useContext(NavigationContext);
  if (!value) throw new Error("useNavigation must be used inside <NavigationProvider>");
  return value;
}

const getServerSection = () => INITIAL_SECTION;

/** The section currently in charge. Re-renders only when it changes. */
export function useActiveSection(): SectionId {
  const { store } = useNavigation();
  return useSyncExternalStore(store.subscribe, store.get, getServerSection);
}

/** Mirrors navigation state onto the document: title and active face color. */
function DocumentSync() {
  const { dictionary } = useI18n();
  const active = useActiveSection();

  useEffect(() => {
    document.documentElement.dataset.face = getSectionFace(active) ?? "none";
    // The title follows the URL, so sections without one keep the last title.
    const routed = parsePath(window.location.pathname)?.section ?? active;
    document.title = pageTitle(dictionary, routed);
  }, [active, dictionary]);

  return null;
}
