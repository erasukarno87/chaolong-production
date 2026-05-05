import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Factory, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const { signIn, user, loading } = useAuth();
  const nav = useNavigate();

  // Redirect setelah auth state benar-benar settle — hindari race condition
  useEffect(() => {
    if (!loading && user) nav("/", { replace: true });
  }, [loading, user, nav]);

  const [credential, setCredential] = useState(""); // email atau username
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [busy,       setBusy]       = useState(false);

  const isEmail = credential.includes("@");

  // Rate limiting state
  const attemptCountRef = useRef(0);
  const lastAttemptRef = useRef(0);
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 30000; // 30 seconds

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting check
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttemptRef.current;
    
    // Reset attempt count if enough time has passed
    if (timeSinceLastAttempt > 5000) {
      attemptCountRef.current = 0;
    }

    // Lockout check - block if too many recent attempts
    if (attemptCountRef.current >= MAX_ATTEMPTS && timeSinceLastAttempt < LOCKOUT_DURATION) {
      const waitSeconds = Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 1000);
      toast.error(`Terlalu banyak percobaan login. Silakan tunggu ${waitSeconds} detik.`);
      return;
    }

    if (!credential.trim()) { toast.error("Email atau username wajib diisi"); return; }
    if (!password)           { toast.error("Password wajib diisi"); return; }

    setBusy(true);
    try {
      let loginEmail = credential.trim();

      // Kalau bukan email, lookup via RPC get_email_by_username
      if (!isEmail) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: found, error: rpcErr } = await (supabase as any)
          .rpc("get_email_by_username", { p_username: credential.trim() });

        if (rpcErr) {
          // Generic error to prevent username enumeration
          toast.error("Login gagal. Silakan coba lagi.");
          attemptCountRef.current += 1;
          return;
        }
        if (!found) {
          // Generic error - don't reveal if username exists
          toast.error("Email/username atau password salah.");
          attemptCountRef.current += 1;
          return;
        }
        loginEmail = found as string;
      }

      const res = await signIn(loginEmail, password);
      if (res.error) {
        // Always show generic error to prevent username enumeration
        toast.error("Email/username atau password salah.");
        attemptCountRef.current += 1;
        return;
      }

      toast.success("Login berhasil");
      // nav("/") tidak dipanggil di sini — useEffect di atas yang handle
      // setelah onAuthStateChange + roles selesai dimuat
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal login");
      attemptCountRef.current += 1;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-4">
      <div className="w-full max-w-sm fade-in">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="h-12 w-12 rounded-xl gradient-primary grid place-items-center shadow-card-md">
            <Factory className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Production System</h1>
            <p className="text-xs text-muted-foreground font-mono">PT. Chao Long Motor Parts Indonesia</p>
          </div>
        </div>

        <Card className="p-6 shadow-card-md">
          <h2 className="text-base font-semibold mb-1">Masuk</h2>
          <p className="text-xs text-muted-foreground mb-5">
            Gunakan email atau username yang diberikan Admin.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cred">Email / Username</Label>
              <Input
                id="cred"
                autoComplete="username"
                autoFocus
                value={credential}
                onChange={e => setCredential(e.target.value)}
                placeholder="email@contoh.id atau username"
              />
              {credential && (
                <p className="text-[11px] text-muted-foreground">
                  {isEmail ? "Login dengan email" : "Login dengan username"}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pw">Password</Label>
              <div className="relative">
                <Input
                  id="pw"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary text-white border-0"
              disabled={busy || attemptCountRef.current >= MAX_ATTEMPTS}
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Masuk
            </Button>
          </form>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center mt-4 font-mono">
          v1.0 · PT. Chao Long Motor Parts Indonesia
        </p>
      </div>
    </div>
  );
}
