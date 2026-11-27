import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { config } from "@/config";
import { translate } from "@/i18n";
import type { ApiError, ApiErrorBody } from "@/types/domain";

export class ApiRequestError extends Error implements ApiError {
  readonly status: number;
  readonly code: string;
  readonly meta?: { items?: unknown[] } & Record<string, unknown>;
  readonly errors?: unknown[];

  constructor(status: number, body: ApiErrorBody) {
    super(body.detail);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = body.code;
    this.meta = body.meta;
    this.errors = body.errors;
  }
}

export const api = axios.create({
  baseURL: config.apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((request: InternalAxiosRequestConfig) => {
  const token = sessionStorage.getItem("access_token");
  if (token) {
    request.headers.set("Authorization", `Bearer ${token}`);
  }
  return request;
});

function clearSession(): void {
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("token_expiry");
  // `cart` and `checkout:idempotency-key` are intentionally preserved.
}

api.interceptors.response.use(
  (response) => response,
  (reason: unknown) => {
    if (reason instanceof AxiosError) {
      const status = reason.response?.status ?? 0;
      const body = reason.response?.data as ApiErrorBody | undefined;
      // A failed login attempt must not log out an already signed-in user.
      const requestUrl = reason.config?.url ?? "";
      if (status === 401 && !requestUrl.includes("/auth/login")) {
        clearSession();
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
      if (status === 0) {
        // AuthProvider turns an unreachable API into the browser-only demo.
        window.dispatchEvent(new CustomEvent("api:unreachable"));
      }
      const normalized = new ApiRequestError(status, {
        detail: body?.detail ?? translate(status === 0 ? "api.network" : "api.requestFailed"),
        code: body?.code ?? (status === 0 ? "NETWORK_ERROR" : "INTERNAL_ERROR"),
        meta: body?.meta,
        errors: body?.errors,
      });
      return Promise.reject(normalized);
    }
    return Promise.reject(
      new ApiRequestError(0, { detail: translate("api.unexpected"), code: "INTERNAL_ERROR" })
    );
  }
);

/** Unwrap the `{ data, message }` envelope used by every backend endpoint. */
export async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}

export type { ApiError };
