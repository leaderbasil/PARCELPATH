import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { isDemoMode } from "@/services/demoMode";
import type { Role } from "@/types/domain";

interface ProtectedRouteProps {
  roles: readonly Role[];
  children: ReactNode;
}

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  // Demo admins are redirected away from checkout, but every other protected
  // route still honours the real role (dashboard remains ADMIN-only).
  if (isDemoMode() && user.role === "ADMIN" && location.pathname.startsWith("/checkout")) {
    return <Navigate to="/admin" replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
