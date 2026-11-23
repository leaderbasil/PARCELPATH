import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/common/Button";
import { CartIcon, LogoutIcon, MenuIcon } from "@/components/common/Icons";
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

function storefrontLinkClass(isActive: boolean): string {
  return cn(
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-primary-soft text-primary-strong" : "text-text-muted hover:bg-background hover:text-text"
  );
}

export function Header({ isAdmin = false, onOpenSidebar }: HeaderProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const demoMode = isDemoMode();
  const page = pageMetaForPath(pathname);

  const handleLogout = (): void => {
    logout();
    navigate("/", { replace: true });
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
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-6">
        <Link to="/" className="flex shrink-0 items-center" aria-label="PARCELPATH">
          <BrandLogo showTagline />
        </Link>

        <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label={UI.appName}>
          <NavLink end to="/" className={({ isActive }) => storefrontLinkClass(isActive)}>
            {UI.nav.catalog}
          </NavLink>
          <NavLink to="/cart" className={({ isActive }) => storefrontLinkClass(isActive)}>
            {UI.nav.cart}
          </NavLink>
          {isAuthenticated ? (
            <NavLink to="/orders" className={({ isActive }) => storefrontLinkClass(isActive)}>
              {UI.nav.myOrders}
            </NavLink>
          ) : null}
          {user?.role === "ADMIN" ? (
            <NavLink to="/admin" className={({ isActive }) => storefrontLinkClass(isActive)}>
              {UI.nav.dashboard}
            </NavLink>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Link
            to="/cart"
            aria-label={`${UI.nav.cart} (${itemCount})`}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:bg-background hover:text-text"
          >
            <CartIcon className="h-[18px] w-[18px]" />
            {itemCount > 0 ? (
              <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-surface">
                {itemCount}
              </span>
            ) : null}
          </Link>
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
  );
}
