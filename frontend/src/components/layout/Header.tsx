import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/common/Button";
import {
  CartIcon,
  CloseIcon,
  DashboardIcon,
  LogoutIcon,
  MenuIcon,
  OrdersIcon,
  ProductsIcon,
} from "@/components/common/Icons";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { UI } from "@/constants/ui";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { isDemoMode } from "@/services/demoMode";
import { cn } from "@/utils/cn";
import { pageMetaForPath } from "@/utils/navigation";

interface HeaderProps {
  isAdmin?: boolean;
  onOpenSidebar?: () => void;
}

function initials(name = ""): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.replace(/^ال/, "").charAt(0))
    .join("");
}

function storefrontButtonClass(isActive: boolean): string {
  return cn(
    "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
    isActive
      ? "border-primary bg-primary text-surface"
      : "border-border bg-surface text-text-muted hover:bg-background hover:text-text"
  );
}

interface MobileNavLinkProps {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  onNavigate: () => void;
}

function MobileNavLink({ to, label, icon, end, onNavigate }: MobileNavLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-surface"
            : "text-text-muted hover:bg-background hover:text-text"
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

export function Header({ isAdmin = false, onOpenSidebar }: HeaderProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const demoMode = isDemoMode();
  const page = pageMetaForPath(pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const handleLogout = (): void => {
    logout();
    navigate("/login", { replace: true });
  };

  if (isAdmin) {
    return (
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label={UI.admin.openMenu}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-background hover:text-text md:hidden"
          >
            <MenuIcon />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text sm:text-base">{page.title}</p>
            <p className="hidden truncate text-xs text-text-muted sm:block">{page.description}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {demoMode ? (
            <span className="hidden rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-strong sm:inline">
              {UI.auth.demoBadge}
            </span>
          ) : null}
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-1 ps-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-strong"
                aria-hidden="true"
              >
                {initials(user.full_name)}
              </span>
              <div className="hidden pe-1 leading-tight sm:block">
                <p className="text-xs font-medium text-text">{user.full_name}</p>
                <p className="text-[11px] text-text-muted">
                  {user.role === "ADMIN" ? UI.admin.roleAdmin : UI.admin.roleCustomer}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                aria-label={UI.nav.logout}
                title={UI.nav.logout}
                className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-danger-soft hover:text-danger-strong"
              >
                <LogoutIcon className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-none items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={UI.admin.openMenu}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-background hover:text-text lg:hidden"
          >
            <MenuIcon />
          </button>
          <Link to="/" className="flex shrink-0 items-center" aria-label="PARCELPATH">
            <BrandLogo
              showTagline
              markClassName="h-14 w-14 rounded-2xl lg:h-10 lg:w-10 lg:rounded-xl"
            />
          </Link>

          {isAuthenticated ? (
            <nav
              className="hidden items-center gap-2 border-s border-border ps-3 lg:flex"
              aria-label={UI.appName}
            >
              <NavLink end to="/" className={({ isActive }) => storefrontButtonClass(isActive)}>
                <ProductsIcon className="h-4 w-4" />
                {UI.nav.catalog}
              </NavLink>
              <NavLink to="/cart" className={({ isActive }) => storefrontButtonClass(isActive)}>
                <CartIcon className="h-4 w-4" />
                {UI.nav.cart}
              </NavLink>
              <NavLink to="/orders" className={({ isActive }) => storefrontButtonClass(isActive)}>
                <OrdersIcon className="h-4 w-4" />
                {UI.nav.myOrders}
              </NavLink>
              {user?.role === "ADMIN" ? (
                <NavLink to="/admin" className={({ isActive }) => storefrontButtonClass(isActive)}>
                  <DashboardIcon className="h-4 w-4" />
                  {UI.nav.dashboard}
                </NavLink>
              ) : null}
            </nav>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/cart"
              aria-label={`${UI.nav.cart} (${itemCount})`}
              className="relative hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:bg-background hover:text-text lg:flex"
            >
              <CartIcon className="h-[18px] w-[18px]" />
              {itemCount > 0 ? (
                <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-surface">
                  {itemCount}
                </span>
              ) : null}
            </Link>
          ) : null}
          {isAuthenticated ? (
            <>
              {demoMode ? (
                <span className="hidden rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-strong xl:inline">
                  {UI.auth.demoBadge}
                </span>
              ) : null}
              <Button variant="secondary" onClick={handleLogout} className="hidden sm:inline-flex">
                {UI.nav.logout}
              </Button>
              <button
                type="button"
                onClick={handleLogout}
                aria-label={UI.nav.logout}
                title={UI.nav.logout}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:bg-danger-soft hover:text-danger-strong sm:hidden"
              >
                <LogoutIcon className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block">
                <Button variant="ghost">{UI.nav.login}</Button>
              </Link>
              <Link to="/register">
                <Button>{UI.nav.register}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
      </header>

      {isAuthenticated ? (
        <Link
          to="/cart"
          aria-label={`${UI.nav.cart} (${itemCount})`}
          className="fixed bottom-5 end-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-surface shadow-lg transition-colors hover:bg-primary-strong lg:hidden"
        >
          <CartIcon className="h-6 w-6" />
          {itemCount > 0 ? (
            <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-surface ring-2 ring-surface">
              {itemCount}
            </span>
          ) : null}
        </Link>
      ) : null}

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label={UI.common.close}
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 h-full w-full bg-overlay/40 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={UI.admin.openMenu}
            className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col border-e border-border bg-surface p-4 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between gap-2">
              <BrandLogo compact />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label={UI.common.close}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-background hover:text-text"
              >
                <CloseIcon />
              </button>
            </div>

            <nav className="flex flex-col gap-1" aria-label={UI.appName}>
              {isAuthenticated ? (
                <>
                  <MobileNavLink
                    to="/"
                    end
                    label={UI.nav.catalog}
                    icon={<ProductsIcon className="h-4 w-4" />}
                    onNavigate={() => setMenuOpen(false)}
                  />
                  <MobileNavLink
                    to="/cart"
                    label={UI.nav.cart}
                    icon={<CartIcon className="h-4 w-4" />}
                    onNavigate={() => setMenuOpen(false)}
                  />
                  <MobileNavLink
                    to="/orders"
                    label={UI.nav.myOrders}
                    icon={<OrdersIcon className="h-4 w-4" />}
                    onNavigate={() => setMenuOpen(false)}
                  />
                  {user?.role === "ADMIN" ? (
                    <MobileNavLink
                      to="/admin"
                      label={UI.nav.dashboard}
                      icon={<DashboardIcon className="h-4 w-4" />}
                      onNavigate={() => setMenuOpen(false)}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <MobileNavLink
                    to="/login"
                    label={UI.nav.login}
                    icon={null}
                    onNavigate={() => setMenuOpen(false)}
                  />
                  <MobileNavLink
                    to="/register"
                    label={UI.nav.register}
                    icon={null}
                    onNavigate={() => setMenuOpen(false)}
                  />
                </>
              )}
            </nav>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm font-medium text-danger hover:bg-danger-soft"
              >
                <LogoutIcon className="h-4 w-4" />
                {UI.nav.logout}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
