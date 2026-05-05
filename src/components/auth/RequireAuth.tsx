import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth, type AppRole } from "@/contexts/AuthContext";

interface Props {
  children: ReactNode;
  /** Roles allowed. If omitted, any authenticated user is allowed. */
  allow?: AppRole[];
}

export function RequireAuth({ children, allow }: Props) {
  const { user, loading, effectiveRole } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Memuat…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;

  if (allow && (!effectiveRole || !allow.includes(effectiveRole))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
