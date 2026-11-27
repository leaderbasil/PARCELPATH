import { getCurrentLocale, type Locale } from "@/i18n";

function formatters(locale: Locale) {
  const tag = locale === "en" ? "en-US" : "ar-EG";
  return {
    dateTime: new Intl.DateTimeFormat(tag, {
      dateStyle: "medium",
      timeStyle: "short",
      numberingSystem: "latn",
    }),
    date: new Intl.DateTimeFormat(tag, {
      dateStyle: "medium",
      numberingSystem: "latn",
    }),
  };
}

export function formatDateTime(value: string | null | undefined, locale: Locale = getCurrentLocale()): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : formatters(locale).dateTime.format(parsed);
}

export function formatDate(value: string | null | undefined, locale: Locale = getCurrentLocale()): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : formatters(locale).date.format(parsed);
}

export function toDateInputValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}
