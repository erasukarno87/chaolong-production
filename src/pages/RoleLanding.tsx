import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/** Sends user to the appropriate landing page for their role. */
export default function RoleLanding() {
  const { effectiveRole, loading, signOut } = useAuth();
  if (loading) return null;

  if (!effectiveRole) {
    // User is authenticated but has no role assigned — show error instead of looping
    return (
      <div className="min-h-screen grid place-items-center bg-background p-4">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-sm font-semibold">Akun belum memiliki role</p>
          <p className="text-xs text-muted-foreground">
            Akun Anda sudah aktif tapi belum ada role yang ditetapkan.
            Minta Super Admin untuk menambahkan role melalui menu Admin → Users & Roles.
          </p>
          <button
            onClick={() => signOut()}
            className="text-xs underline text-muted-foreground hover:text-foreground"
          >
            Keluar
          </button>
        </div>
      </div>
    );
  }

  switch (effectiveRole) {
    case "super_admin": return <Navigate to="/admin"      replace />;
    case "leader":      return <Navigate to="/shift"      replace />;
    case "supervisor":
    case "manager":
    default:            return <Navigate to="/monitoring" replace />;
  }
}
