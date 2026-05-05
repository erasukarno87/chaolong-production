/**
 * Main permission-based route guard.
 * Checks authentication and required permissions before rendering children.
 * 
 * @example
 * <RequirePermission permissions={["monitoring.view"]}>
 *   <MonitoringDashboard />
 * </RequirePermission>
 */

import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";

interface Props {
  children: ReactNode;
  /** Permissions required. If omitted, any authenticated user is allowed. */
  permissions?: Permission[];
  /** Fallback component when permission denied */
  fallback?: ReactNode;
  /** Whether to show loading state while checking permissions */
  showLoading?: boolean;
}

export function RequirePermission({ 
  children, 
  permissions = [], 
  fallback = null, 
  showLoading = true 
}: Props) {
  const { loading: authLoading } = useAuth();
  const { isAuthenticated, canAccessRoute } = usePermissions();
  const loc = useLocation();

  const permissionCheck = canAccessRoute(permissions);

  if (authLoading && showLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Memuat…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  if (!permissionCheck.has) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Re-export RequireAuth from dedicated file for clean architecture
// Avoid duplicate exports - single source of truth in RequireAuth.tsx
export { RequireAuth } from "./RequireAuth";