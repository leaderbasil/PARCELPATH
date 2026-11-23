import { demoCredentials, demoLoginEnabled } from "@/constants/demo";
import type { LoginIn, RegisterIn, TokenOut, User } from "@/types/domain";

import { ApiRequestError, api, unwrap } from "./api";
import { DEMO_TOKEN, demoError, isDemoMode } from "./demoMode";
import {
  ensureDemoAdmin,
  getDemoAdminUser,
  getStoredDemoUsers,
  makeDemoId,
  saveDemoUsers,
} from "./mockDemoData";

function demoSession(email?: string): TokenOut {
  const user = ensureDemoAdmin(email ?? demoCredentials?.email ?? "demo@parcelpath.local");
  return {
    access_token: DEMO_TOKEN,
    token_type: "bearer",
    expires_in: 1800,
    user,
  };
}

export async function login(payload: LoginIn): Promise<TokenOut> {
  const email = payload.email.trim().toLowerCase();
  if (
    demoLoginEnabled &&
    demoCredentials &&
    email === demoCredentials.email.trim().toLowerCase() &&
    payload.password === demoCredentials.password
  ) {
    return demoSession(demoCredentials.email);
  }
  return unwrap(api.post<{ data: TokenOut }>("/auth/login", payload));
}

export function loginDemo(): Promise<TokenOut> {
  if (!demoLoginEnabled || !demoCredentials) {
    throw new ApiRequestError(403, {
      detail: "الوضع التجريبي غير مفعّل في هذا النشر.",
      code: "FORBIDDEN",
    });
  }
  return Promise.resolve(demoSession(demoCredentials.email));
}

export async function register(payload: RegisterIn): Promise<User> {
  if (isDemoMode()) {
    const users = getStoredDemoUsers();
    const email = payload.email.trim().toLowerCase();
    if (users.some((user) => user.email.toLowerCase() === email)) {
      throw demoError("DUPLICATE_EMAIL", 409);
    }
    const user: User = {
      id: makeDemoId("user"),
      full_name: payload.full_name.trim(),
      email,
      phone: payload.phone?.trim() ?? null,
      role: "CUSTOMER",
      is_active: true,
      created_at: new Date().toISOString(),
    };
    users.unshift(user);
    saveDemoUsers(users);
    return user;
  }
  return unwrap(api.post<{ data: User }>("/auth/register", payload));
}

export async function me(): Promise<User> {
  if (isDemoMode()) return getDemoAdminUser();
  return unwrap(api.get<{ data: User }>("/auth/me"));
}

export const authService = { login, loginDemo, register, me };
