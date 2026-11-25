/** Single source of truth for runtime configuration. */
const env = import.meta.env as Record<string, unknown>;

function readEnv(name: string): string | undefined {
  const value = env[name];
  return typeof value === "string" ? value : undefined;
}

const rawBaseUrl = readEnv("VITE_API_BASE_URL");
const apiBaseUrl = rawBaseUrl && rawBaseUrl.length > 0 ? rawBaseUrl : "http://localhost:8000/api/v1";
const rawUploadUrl = readEnv("VITE_OBJECT_STORAGE_UPLOAD_URL");
const objectStorageUploadUrl =
  rawUploadUrl?.trim() || `${apiBaseUrl.replace(/\/+$/, "")}/uploads`;
const rawWhatsappCode = readEnv("VITE_WHATSAPP_COUNTRY_CODE");
const whatsappCountryCode = rawWhatsappCode?.replace(/\D/g, "") || "966";

let healthUrl = "http://localhost:8000/health";
try {
  healthUrl = new URL("/health", apiBaseUrl).toString();
} catch {
  // Keep the default when the configured base URL is relative or malformed.
}

export const config = {
  apiBaseUrl,
  healthUrl,
  objectStorageUploadUrl,
  whatsappCountryCode,
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
