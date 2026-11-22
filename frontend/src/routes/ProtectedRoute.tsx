import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
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

  if (!roles.includes(user.role)) {
    if (user.role === "ADMIN" && location.pathname.startsWith("/checkout")) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
