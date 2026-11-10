"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Locale } from "./config";
import { loadDictionary, type Dictionary } from "./dictionaries";

interface I18nState {
  locale: Locale;
  dictionary: Dictionary;
}

interface I18nValue extends I18nState {
  /**
   * Swaps the interface language in place. Nothing is remounted, so the
   * persistent 3D scene and the scroll position survive the switch.
   * Resolves once the new dictionary has been applied.
   */
  setLocale: (locale: Locale) => Promise<void>;
}

const I18nContext = createContext<I18nValue | null>(null);

interface I18nProviderProps extends I18nState {
  children: ReactNode;
}

export function I18nProvider({ locale, dictionary, children }: I18nProviderProps) {
  const [state, setState] = useState<I18nState>({ locale, dictionary });
  const latestRequest = useRef(0);

  const setLocale = useCallback(async (next: Locale) => {
    const request = ++latestRequest.current;
    const nextDictionary = await loadDictionary(next);
    // A newer switch superseded this one while its dictionary was loading.
    if (request !== latestRequest.current) return;
    setState((previous) => (previous.locale === next ? previous : { locale: next, dictionary: nextDictionary }));
  }, []);

  useEffect(() => {
    document.documentElement.lang = state.locale;
  }, [state.locale]);

  const value = useMemo<I18nValue>(() => ({ ...state, setLocale }), [state, setLocale]);

  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
