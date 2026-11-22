const dateTimeFormatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
  numberingSystem: "latn",
});

const dateFormatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  numberingSystem: "latn",
});

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : dateTimeFormatter.format(parsed);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : dateFormatter.format(parsed);
}

export function toDateInputValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}
