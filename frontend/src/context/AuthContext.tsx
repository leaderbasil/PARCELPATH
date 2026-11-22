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
import { authService } from "@/services/auth.service";

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
  }, []);

  const login = useCallback((accessToken: string, userData: User, expiresIn: number) => {
    setToken(accessToken);
    setUser(userData);
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(userData));
    sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
  }, []);

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
