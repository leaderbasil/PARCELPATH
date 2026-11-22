import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { UI } from "@/constants/ui";
import { Button } from "@/components/common/Button";
import { config } from "@/config";

export function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2" aria-label="PARCELPATH">
          <img
            src={PARCELPATH_LOGO}
            alt="PARCELPATH"
            className="h-9 w-auto rounded-lg bg-surface object-contain"
          />
          <span className="hidden text-lg font-bold text-primary-strong sm:inline">
            {config.appName}
          </span>
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-3 text-sm">
          <Link className="text-text hover:text-primary" to="/">
            {UI.nav.catalog}
          </Link>
          <Link className="text-text hover:text-primary" to="/cart">
            {UI.nav.cart} ({itemCount})
          </Link>
          {isAuthenticated ? (
            <Link className="text-text hover:text-primary" to="/orders">
              {UI.nav.myOrders}
            </Link>
          ) : null}
          {user?.role === "ADMIN" ? (
            <Link className="text-text hover:text-primary" to="/admin">
              {UI.nav.dashboard}
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <span className="hidden text-xs text-text-muted sm:inline">{user?.full_name}</span>
              <Button
                variant="secondary"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                {UI.nav.logout}
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
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
