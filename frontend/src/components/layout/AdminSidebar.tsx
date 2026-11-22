import { NavLink } from "react-router-dom";
import { UI } from "@/constants/ui";
import { cn } from "@/utils/cn";

const links = [
  { to: "/admin", label: UI.admin.dashboard, end: true },
  { to: "/admin/orders", label: UI.nav.orders, end: false },
  { to: "/admin/products", label: UI.nav.products, end: false },
  { to: "/admin/users", label: UI.nav.users, end: false },
] as const;

export function AdminSidebar() {
  return (
    <aside className="w-full shrink-0 border-b border-border bg-surface md:w-56 md:border-b-0 md:border-e">
      <nav className="flex gap-1 overflow-x-auto p-3 md:flex-col">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              cn(
                "whitespace-nowrap rounded-lg px-3 py-2 text-sm",
                isActive ? "bg-primary-soft font-medium text-primary-strong" : "text-text hover:bg-background"
              )
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
