import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * IndexPage — Root route redirect
 * 
 * Automatically redirects to:
 * - /monitoring (if authenticated)
 * - /login (if not authenticated)
 */
export default function IndexPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    
    // Check for redirect target from query params (e.g., ?redirect=/some-path)
    const params = new URLSearchParams(location.search);
    const redirectTo = params.get("redirect");
    
    if (user) {
      // Authenticated: redirect to monitoring or specified path
      navigate(redirectTo || "/monitoring", { replace: true });
    } else {
      // Not authenticated: redirect to login
      navigate(`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`, { replace: true });
    }
  }, [user, isLoading, navigate, location.search]);

  // Loading state with branded styling
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="absolute inset-0 h-12 w-12 animate-pulse rounded-full bg-primary/20 blur-xl" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">Production System</p>
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    </div>
  );
}
