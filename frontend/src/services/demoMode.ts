import { getErrorMessage } from "@/constants/messages";
import type { Page } from "@/types/domain";

import { ApiRequestError } from "./api";

/** Local token that marks a browser-only PARCELPATH demo session. */
export const TOKEN_STORAGE_KEY = "access_token";
export const DEMO_TOKEN = "parcelpath-demo-token-v1";

export function isDemoMode(): boolean {
  return (
    typeof window !== "undefined" &&
    sessionStorage.getItem(TOKEN_STORAGE_KEY) === DEMO_TOKEN
  );
}

/** Mimic the backend error shape so existing error handling keeps working. */
export function demoError(
  code: string,
  status = 400,
  meta?: Record<string, unknown>
): ApiRequestError {
  return new ApiRequestError(status, { detail: getErrorMessage(code), code, meta });
}

export function parseDemoBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

export function localDateKey(value: Date | string = new Date()): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return localDateKey();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(dateKey: string, delta: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() + delta);
  return localDateKey(date);
}

export function enumerateDateKeys(from: string, to: string): string[] {
  const keys: string[] = [];
  let current = from;
  while (current <= to) {
    keys.push(current);
    current = addDays(current, 1);
  }
  return keys;
}

export function enumerateMonthKeys(from: string, to: string): string[] {
  const keys: string[] = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7));
  const endYear = Number(to.slice(0, 4));
  const endMonth = Number(to.slice(5, 7));
  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return keys;
}

export function resolveDemoRange(
  from?: string,
  to?: string,
  defaultDays = 30
): { from: string; to: string } {
  const dateTo = to || localDateKey();
  const dateFrom = from || addDays(dateTo, -(defaultDays - 1));
  if (dateFrom > dateTo) throw demoError("INVALID_DATE_RANGE");
  return { from: dateFrom, to: dateTo };
}

export interface DemoPageParams {
  page?: number | string;
  page_size?: number | string;
}

export function paginateDemoItems<T>(
  items: T[],
  params: DemoPageParams = {},
  defaultPageSize = 12
): Page<T> {
  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(String(params.page_size ?? String(defaultPageSize)), 10) || defaultPageSize)
  );
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    page_size: pageSize,
  };
}
