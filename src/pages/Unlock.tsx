/**
 * Halaman ini tidak lagi digunakan.
 * Setiap leader login langsung dengan akun Supabase pribadi — tidak ada shared device / PIN unlock.
 */
import { Navigate } from "react-router-dom";
export default function Unlock() {
  return <Navigate to="/" replace />;
}
