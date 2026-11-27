import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { ReactElement, ReactNode } from "react";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { I18nProvider } from "@/i18n";
import type { CartItem, User } from "@/types/domain";

/** A QueryClient that never retries so failing requests settle immediately. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}

type RouteEntry =
  | string
  | { pathname: string; search?: string; hash?: string; state?: unknown };

interface RenderWithProvidersOptions {
  route?: RouteEntry;
  queryClient?: QueryClient;
}

/** Render any tree with Query, Auth, Cart and Router providers attached. */
export function renderWithProviders(
  ui: ReactNode,
  { route = "/", queryClient = createTestQueryClient() }: RenderWithProvidersOptions = {}
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={[route]}>
            <AuthProvider>
              <CartProvider>{ui}</CartProvider>
            </AuthProvider>
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

/** Drop into a test's Routes (or next to them) to assert navigation. */
export function LocationDisplay(): ReactElement {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

/** Seed a session BEFORE renderWithProviders: AuthProvider hydrates on mount. */
export function seedSession(user: User, token = "test-token"): void {
  sessionStorage.setItem("access_token", token);
  sessionStorage.setItem("user", JSON.stringify(user));
  sessionStorage.setItem("token_expiry", String(Date.now() + 3_600_000));
}

/** Seed the cart BEFORE renderWithProviders: CartProvider hydrates on mount. */
export function seedCart(items: CartItem[]): void {
  localStorage.setItem("cart", JSON.stringify(items));
}

/**
 * Forms in the app use Arabic labels, but some use placeholders or aria-labels.
 * This helper accepts all three so the tests stay coupled to the visible copy,
 * not to a particular input wrapper.
 */
export function findField(label: string): HTMLElement {
  const field =
    screen.queryByLabelText(label) ??
    screen.queryByPlaceholderText(label) ??
    screen.queryByRole("textbox", { name: label });
  if (!field) throw new Error(`Form field not found: ${label}`);
  return field;
}

/** Parse a stored cart without assuming the stored value is well formed. */
export function storedCart(): CartItem[] {
  const raw: unknown = JSON.parse(localStorage.getItem("cart") ?? "[]");
  return Array.isArray(raw) ? (raw as CartItem[]) : [];
}
