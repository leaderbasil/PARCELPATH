import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@/types/domain";
import { config } from "@/config";
import { DEMO_AUTO_LOGIN_DISABLED_KEY, demoAutoLoginEnabled, demoLoginEnabled } from "@/constants/demo";
import { authService } from "@/services/auth.service";
import { isDemoMode } from "@/services/demoMode";

const TOKEN_KEY = "access_token";
const USER_KEY = "user";
const EXPIRY_KEY = "token_expiry";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User, expiresIn: number) => void;
  logout: () => void;
  setUser: (user: User) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredSession(): { token: string | null; user: User | null } {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const raw = sessionStorage.getItem(USER_KEY);
  const expiry = Number(sessionStorage.getItem(EXPIRY_KEY) ?? 0);
  if (!token || !raw || !Number.isFinite(expiry) || Date.now() >= expiry) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
    return { token: null, user: null };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "id" in parsed &&
      "role" in parsed
    ) {
      return { token, user: parsed as User };
    }
  } catch {
    // Corrupt storage is treated as a logged-out session.
  }
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(EXPIRY_KEY);
  return { token: null, user: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Hydrate synchronously so ProtectedRoute never redirects before restoration.
  const [initial] = useState(readStoredSession);
  const [token, setToken] = useState<string | null>(initial.token);
  const [user, setUser] = useState<User | null>(initial.user);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
    try {
      localStorage.setItem(DEMO_AUTO_LOGIN_DISABLED_KEY, "1");
    } catch {
      // Storage may be unavailable; the manual demo button still works.
    }
  }, []);

  const login = useCallback((accessToken: string, userData: User, expiresIn: number) => {
    setToken(accessToken);
    setUser(userData);
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(userData));
    sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
    try {
      // An explicit sign-in (real or demo) re-enables automatic demo fallback.
      localStorage.removeItem(DEMO_AUTO_LOGIN_DISABLED_KEY);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const activateDemo = useCallback(async () => {
    if (!demoLoginEnabled || isDemoMode()) return;
    try {
      // Respect an explicit logout so it is actually possible to leave demo mode.
      if (localStorage.getItem(DEMO_AUTO_LOGIN_DISABLED_KEY) === "1") return;
    } catch {
      // Ignore storage failures.
    }
    const session = await authService.loginDemo("CUSTOMER");
    login(session.access_token, session.user, session.expires_in);
  }, [login]);

  const refresh = useCallback(async () => {
    if (!sessionStorage.getItem(TOKEN_KEY)) return;
    const profile = await authService.me();
    setUser(profile);
    sessionStorage.setItem(USER_KEY, JSON.stringify(profile));
  }, []);

  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, [logout]);

  // First visit opens the demo, and an unreachable backend always falls back to it.
  useEffect(() => {
    if (!demoLoginEnabled || import.meta.env.MODE === "test" || isDemoMode()) return;

    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);

    const apiIsReachable = async (): Promise<boolean> => {
      try {
        const response = await fetch(config.healthUrl, { signal: controller.signal });
        return response.ok;
      } catch {
        return false;
      }
    };

    const start = async () => {
      let optedOut = false;
      try {
        optedOut = localStorage.getItem(DEMO_AUTO_LOGIN_DISABLED_KEY) === "1";
      } catch {
        // Ignore storage failures.
      }
      const firstVisit = demoAutoLoginEnabled && !token && !user && !optedOut;
      if (firstVisit || !(await apiIsReachable())) {
        if (!cancelled) await activateDemo().catch(() => undefined);
      }
    };

    const onUnreachable = () => {
      void activateDemo().catch(() => undefined);
    };

    void start();
    window.addEventListener("api:unreachable", onUnreachable);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
      window.removeEventListener("api:unreachable", onUnreachable);
    };
  }, [token, user, activateDemo]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: user !== null && token !== null,
      login,
      logout,
      setUser,
      refresh,
    }),
    [user, token, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
