import { useEffect, useState } from "react";
import { FormModal } from "@/components/ui/form-modal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AtSign, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";

// --- Types -------------------------------------------------------------------
type AppRole = "super_admin" | "leader" | "supervisor" | "manager";

export interface UserRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  roles: AppRole[];
}

// --- Shared constants --------------------------------------------------------
const ALL_ROLES: AppRole[] = ["super_admin", "leader", "supervisor", "manager"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (t: string) => supabase.from(t) as any;

const makeTempClient = () =>
  createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false, storageKey: "temp-create-user" } },
  );

// =============================================================================
// EditUserModal
// =============================================================================
interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow | null;
  onSuccess: () => void;
}

export function EditUserModal({ open, onOpenChange, user, onSuccess }: EditUserModalProps) {
  const [picked, setPicked] = useState<AppRole[]>([]);
  const [uname,  setUname]  = useState("");
  const [busy,   setBusy]   = useState(false);

  // Sync state when modal opens or target user changes
  useEffect(() => {
    if (open && user) {
      setPicked([...user.roles]);
      setUname(user.username ?? "");
    }
  }, [open, user]);

  const toggleRole = (r: AppRole) =>
    setPicked(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r]);

  const handleSubmit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const profilePatch: Record<string, unknown> = { username: uname.trim() || null };
      const { error: profErr } = await db("profiles")
        .update(profilePatch)
        .eq("user_id", user.user_id);
      if (profErr) {
        if (profErr.code === "PGRST204" || profErr.message?.includes("username")) {
          toast.warning("Kolom username belum ada. Jalankan migration 012 di SQL Editor terlebih dahulu.");
        } else {
          throw new Error(profErr.message);
        }
      }

      const { error: delErr } = await db("user_roles").delete().eq("user_id", user.user_id);
      if (delErr) throw new Error(delErr.message);
      if (picked.length > 0) {
        const { error: insErr } = await db("user_roles").insert(
          picked.map(role => ({ user_id: user.user_id, role }))
        );
        if (insErr) throw new Error(insErr.message);
      }

      toast.success("User diperbarui");
      onOpenChange(false);
      onSuccess();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit User"
      onSubmit={handleSubmit}
      busy={busy}
    >
      <div className="space-y-3.5">
        <div className="space-y-1.5">
          <Label>Username Login</Label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-8"
              value={uname}
              onChange={e => setUname(e.target.value.toLowerCase().replace(/\s+/g, "."))}
              placeholder="budi.santoso"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {ALL_ROLES.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => toggleRole(r)}
                className={`px-3 py-1.5 rounded-lg text-xs border font-medium transition-all ${
                  picked.includes(r)
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">Pilih satu atau lebih role untuk user ini</p>
        </div>
      </div>
    </FormModal>
  );
}

// =============================================================================
// AddUserModal
// =============================================================================
interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddUserModal({ open, onOpenChange, onSuccess }: AddUserModalProps) {
  const [newEmail,  setNewEmail]  = useState("");
  const [newPass,   setNewPass]   = useState("");
  const [newName,   setNewName]   = useState("");
  const [newUname,  setNewUname]  = useState("");
  const [newRoles,  setNewRoles]  = useState<AppRole[]>(["leader"]);
  const [showPass,  setShowPass]  = useState(false);
  const [busy,      setBusy]      = useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  // Reset form each time the modal opens
  useEffect(() => {
    if (open) {
      setNewEmail(""); setNewPass(""); setNewName(""); setNewUname("");
      setNewRoles(["leader"]); setShowPass(false); setErrors({});
    }
  }, [open]);

  const clearErr = (f: string) => setErrors(e => { const n = { ...e }; delete n[f]; return n; });
  const errCls   = (f: string) => errors[f] ? "border-destructive focus-visible:ring-destructive" : "";

  const toggleRole = (r: AppRole) =>
    setNewRoles(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r]);

  const handleSubmit = async () => {
    const newErr: Record<string, string> = {};
    if (!newEmail.trim()) newErr.email = "Email wajib diisi";
    if (newPass.length < 6) newErr.password = "Password minimal 6 karakter";
    if (Object.keys(newErr).length > 0) { setErrors(newErr); return; }
    setBusy(true);
    try {
      const tempAuthClient = makeTempClient();
      const { data: signUpData, error: signUpErr } = await tempAuthClient.auth.signUp({
        email:    newEmail.trim(),
        password: newPass,
        options:  { data: { display_name: newName.trim() || newEmail.trim() } },
      });
      if (signUpErr) throw new Error(signUpErr.message);
      if (!signUpData.user) throw new Error("User gagal dibuat — cek pengaturan Supabase");

      const needsConfirm = !signUpData.session;
      const newUserId = signUpData.user.id;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("profiles") as any).upsert({
        user_id:      newUserId,
        email:        newEmail.trim(),
        display_name: newName.trim()  || null,
        username:     newUname.trim() || null,
      }, { onConflict: "user_id" });

      await db("user_roles").delete().eq("user_id", newUserId);
      if (newRoles.length > 0) {
        const { error: roleErr } = await db("user_roles").insert(
          newRoles.map(role => ({ user_id: newUserId, role }))
        );
        if (roleErr) throw roleErr;
      }

      if (needsConfirm) {
        toast.warning(`User dibuat, tapi perlu konfirmasi email sebelum bisa login. Nonaktifkan "Confirm email" di Supabase → Authentication → Providers → Email.`);
      } else {
        toast.success(`User ${newEmail.trim()} berhasil dibuat`);
      }
      onOpenChange(false);
      onSuccess();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Tambah User Baru"
      onSubmit={handleSubmit}
      busy={busy}
    >
      <div className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Nama Tampilan</Label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Budi Santoso"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Username Login</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-8"
                value={newUname}
                onChange={e => setNewUname(e.target.value.toLowerCase().replace(/\s+/g, "."))}
                placeholder="budi.santoso"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Email <span className="text-destructive">*</span></Label>
          <Input
            type="email"
            value={newEmail}
            className={errCls("email")}
            onChange={e => { clearErr("email"); setNewEmail(e.target.value); }}
            placeholder="budi@contoh.id"
          />
          {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Password <span className="text-destructive">*</span> <span className="text-muted-foreground font-normal">(min. 6 karakter)</span></Label>
          <div className="relative">
            <Input
              type={showPass ? "text" : "password"}
              value={newPass}
              onChange={e => { clearErr("password"); setNewPass(e.target.value); }}
              className={`pr-10 ${errCls("password")}`}
              placeholder="min. 6 karakter"
            />
            <button type="button"
              onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-[11px] text-destructive">{errors.password}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Role</Label>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {ALL_ROLES.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => toggleRole(r)}
                className={`px-3 py-1.5 rounded-lg text-xs border font-medium transition-all ${
                  newRoles.includes(r)
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">Pilih satu atau lebih role untuk user ini</p>
        </div>
      </div>
    </FormModal>
  );
}
