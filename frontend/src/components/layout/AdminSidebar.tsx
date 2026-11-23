import { NavLink } from "react-router-dom";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { CloseIcon, DashboardIcon, OrdersIcon, ProductsIcon, UsersIcon } from "@/components/common/Icons";
import { UI } from "@/constants/ui";
import { isDemoMode } from "@/services/demoMode";
import { cn } from "@/utils/cn";

const links = [
  { to: "/admin", label: UI.admin.dashboard, icon: DashboardIcon, end: true },
  { to: "/admin/orders", label: UI.nav.orders, icon: OrdersIcon, end: false },
  { to: "/admin/products", label: UI.nav.products, icon: ProductsIcon, end: false },
  { to: "/admin/users", label: UI.nav.users, icon: UsersIcon, end: false },
] as const;

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

function SidebarContent({ onNavigate, showClose = false }: { onNavigate?: () => void; showClose?: boolean }) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <NavLink to="/" onClick={onNavigate} className="min-w-0" aria-label="PARCELPATH">
          <BrandLogo />
        </NavLink>
        {showClose ? (
          <button
            type="button"
            onClick={onNavigate}
            aria-label={UI.admin.closeMenu}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-background hover:text-text"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label={UI.admin.dashboard}>
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          {UI.admin.dashboard}
        </p>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-soft text-primary-strong"
                    : "text-text-muted hover:bg-background hover:text-text"
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border p-4 text-xs text-text-muted">
        {isDemoMode() ? (
          <span className="inline-flex rounded-full bg-primary-soft px-2.5 py-1 font-medium text-primary-strong">
            {UI.auth.demoBadge}
          </span>
        ) : (
          <span>PARCELPATH · 1.0</span>
        )}
      </div>
    </>
  );
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-border bg-surface md:flex">
        <SidebarContent />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label={UI.admin.closeMenu}
            onClick={onClose}
            className="absolute inset-0 h-full w-full bg-overlay/40 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 start-0 flex w-72 flex-col border-e border-border bg-surface shadow-card">
            <SidebarContent onNavigate={onClose} showClose />
          </aside>
        </div>
      ) : null}
    </>
  );
}
