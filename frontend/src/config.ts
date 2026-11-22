/** Single source of truth for runtime configuration. */
const rawBaseUrl = import.meta.env["VITE_API_BASE_URL"];

export const config = {
  apiBaseUrl: rawBaseUrl && rawBaseUrl.length > 0 ? rawBaseUrl : "http://localhost:8000/api/v1",
  appName: "متجر الطلبات والتتبّع",
  trackingPollMs: 30_000,
  pageSize: 12,
  currency: new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  dateTime: new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
    numberingSystem: "latn",
  }),
  date: new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    numberingSystem: "latn",
  }),
} as const;

export type AppConfig = typeof config;
