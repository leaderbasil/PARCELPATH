import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import ar from "@/locales/ar.json";
import en from "@/locales/en.json";

export type Locale = "ar" | "en";
export type Direction = "rtl" | "ltr";
export type Translation = typeof ar;
export type UIText = Translation["ui"];

export const LOCALE_STORAGE_KEY = "parcelpath-locale";

const dictionaries = { ar, en } as const;

export function normalizeLocale(value: unknown): Locale {
  return value === "en" ? "en" : "ar";
}

/** Read the saved locale without requiring React (safe for services and utils). */
export function getCurrentLocale(): Locale {
  try {
    return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return "ar";
  }
}

export function getTranslation(locale: Locale = getCurrentLocale()): Translation {
  return dictionaries[locale] as unknown as Translation;
}

export function getUI(locale: Locale = getCurrentLocale()): UIText {
  return getTranslation(locale).ui;
}

/** Tiny dot-path helper for copy that lives outside the main `ui` tree. */
export function translate(path: string, locale: Locale = getCurrentLocale()): string {
  let current: unknown = getTranslation(locale);
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object" || !(part in current)) return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : path;
}

export function directionFor(locale: Locale): Direction {
  return locale === "ar" ? "rtl" : "ltr";
}

export function applyLocale(locale: Locale): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.lang = locale;
  root.dir = directionFor(locale);
}

function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Browsers with storage disabled still work with the in-memory locale.
  }
}

interface I18nValue {
  locale: Locale;
  dir: Direction;
  ui: UIText;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (path: string) => string;
}

const fallbackValue: I18nValue = {
  locale: "ar",
  dir: "rtl",
  ui: dictionaries.ar.ui as unknown as UIText,
  setLocale: () => undefined,
  toggleLocale: () => undefined,
  t: (path) => translate(path, "ar"),
};

export const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getCurrentLocale);

  useEffect(() => {
    applyLocale(locale);
    storeLocale(locale);
    const copy = getTranslation(locale).ui;
    document.title = copy.metaTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", copy.metaDescription);
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const change = (next: Locale): void => {
      storeLocale(next);
      applyLocale(next);
      setLocaleState(next);
    };
    return {
      locale,
      dir: directionFor(locale),
      ui: getTranslation(locale).ui,
      setLocale: change,
      toggleLocale: () => change(locale === "ar" ? "en" : "ar"),
      t: (path) => translate(path, locale),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext) ?? fallbackValue;
}

export function useUI(): UIText {
  return useI18n().ui;
}
