import { useEffect, useState } from "react";
import { AdminSection, SortableDataTable, ColDef, RowActions, TableToolbar, Pager } from "@/components/admin/AdminSection";
import { useTableControls, SortOption } from "@/hooks/useTableControls";
import { Button } from "@/components/ui/button";
import { Pencil, AtSign, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { CsvButtons } from "@/components/admin/CsvButtons";
import { EditUserModal, AddUserModal } from "@/components/admin/UserFormModal";

// Temp auth client for user management operations
// Cached to prevent multiple GoTrueClient instances during session
// Single instance reused across all CSV imports while component is mounted
let _tempClient: ReturnType<typeof createClient> | null = null;
const getTempClient = () => {
  if (!_tempClient) {
    _tempClient = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false, storageKey: "temp-create-user" } },
    );
  }
  return _tempClient;
};

type AppRole = "super_admin" | "leader" | "supervisor" | "manager";

interface UserRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  roles: AppRole[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (t: string) => supabase.from(t) as any;


const USER_SORT: SortOption<UserRow>[] = [
  { label: "Email A→Z", fn: (a, b) => (a.email ?? "").localeCompare(b.email ?? "") },
  { label: "Email Z→A", fn: (a, b) => (b.email ?? "").localeCompare(a.email ?? "") },
  { label: "Nama A→Z",  fn: (a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? "") },
];

const USER_COLS: ColDef[] = [
  { label: "Nama",     sortAsc: 2, filterKey: "display_name" },
  { label: "Email",    sortAsc: 0, sortDesc: 1, filterKey: "email" },
  { label: "Username", filterKey: "username" },
  { label: "Roles" },
  { label: "",         className: "w-[80px]" },
];
const USER_SEARCH = ["email", "display_name"] as (keyof UserRow)[];

export function UsersTab() {
  const [rows,    setRows]    = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const tc = useTableControls(rows, USER_SEARCH, USER_SORT);

  // Edit modal
  const [editOpen,   setEditOpen]   = useState(false);
  const [target,     setTarget]     = useState<UserRow | null>(null);

  // Add modal — form managed by AddUserModal
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }] = await Promise.all([
      // Coba select dengan username; jika kolom belum ada (migration belum run) fallback
      db("profiles").select("user_id, email, display_name, username").order("created_at")
        .then((r: { data: unknown; error: unknown }) => {
          if (r.error) return db("profiles").select("user_id, email, display_name").order("created_at");
          return r;
        }),
      db("user_roles").select("user_id, role"),
    ]);
    const byUser = new Map<string, UserRow>();
    (profs ?? []).forEach((p: Record<string, unknown>) =>
      byUser.set(p.user_id as string, { ...p as UserRow, username: (p.username as string | null) ?? null, roles: [] })
    );
    (roles ?? []).forEach((r: Record<string, unknown>) => {
      const row = byUser.get(r.user_id as string);
      if (row) row.roles.push(r.role as AppRole);
    });
    setRows([...byUser.values()]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // ─── Edit user ──────────────────────────────────────────────────────────────
  const startEdit = (r: UserRow) => {
    setTarget(r);
    setEditOpen(true);
  };

  // ─── Delete user (hapus akses: roles + username) ─────────────────────────────
  const deleteUser = async (r: UserRow) => {
    if (!confirm(`Hapus akses "${r.display_name ?? r.email}"?\n\nSemua role akan dihapus dan username dikosongkan. Akun auth tetap ada di Supabase.`)) return;
    try {
      await db("user_roles").delete().eq("user_id", r.user_id);
      await db("profiles").update({ username: null }).eq("user_id", r.user_id);
      toast.success("Akses user dihapus");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    }
  };

  // ─── Add user ───────────────────────────────────────────────────────────────
  const openAdd = () => setAddOpen(true);

  // ─── CSV Import ──────────────────────────────────────────────────────────────
  // Template: email, password, display_name, username, roles (koma-separated)
  // Max batch size to prevent DoS via mass user creation
  const MAX_BATCH_SIZE = 50;
  
  const importUsers = async (rows: Record<string, string>[]) => {
    const VALID_ROLES: AppRole[] = ["super_admin", "leader", "supervisor", "manager"];
    const errors: string[] = [];
    let imported = 0;

    // Quota check - prevent mass user creation
    if (rows.length > MAX_BATCH_SIZE) {
      toast.error(`Batch terlalu besar. Maksimal ${MAX_BATCH_SIZE} user per impor.`);
      return { imported: 0, errors: [`Maksimal ${MAX_BATCH_SIZE} user per impor`] };
    }

    // Use cached temp client - single instance reused for entire import batch
    const tempAuthClient = getTempClient();

    for (const r of rows) {
      const email = r.email?.trim();
      const password = r.password?.trim();
      if (!email || !password) { errors.push(`Baris dilewati: email & password wajib diisi`); continue; }
      if (password.length < 6) { errors.push(`${email}: password minimal 6 karakter`); continue; }

      const rawRoles = (r.roles ?? "leader").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      const parsedRoles = rawRoles.filter(x => VALID_ROLES.includes(x as AppRole)) as AppRole[];
      if (parsedRoles.length === 0) parsedRoles.push("leader");

      try {
        const { data: signUpData, error: signUpErr } = await tempAuthClient.auth.signUp({
          email,
          password,
          options: { data: { display_name: r.display_name?.trim() || email } },
        });
        if (signUpErr) { errors.push(`${email}: ${signUpErr.message}`); continue; }
        if (!signUpData.user) { errors.push(`${email}: user gagal dibuat`); continue; }

        const uid = signUpData.user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("profiles") as any).upsert({
          user_id: uid,
          email,
          display_name: r.display_name?.trim() || null,
          username: r.username?.trim().toLowerCase() || null,
        }, { onConflict: "user_id" });

        await db("user_roles").delete().eq("user_id", uid);
        await db("user_roles").insert(parsedRoles.map(role => ({ user_id: uid, role })));
        imported++;
      } catch (e: unknown) {
        errors.push(`${email}: ${e instanceof Error ? e.message : "Gagal"}`);
      }
    }

    load();
    return { imported, errors };
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <AdminSection
        title="Users & Roles"
        description="Akun login staff. Atur role dan username untuk login tanpa email."
        onAdd={openAdd}
        rightSlot={
          <CsvButtons
            templateFilename="template-users.csv"
            templateHeaders={["email","password","display_name","username","roles"]}
            templateSample={["staff@contoh.id","password123","Budi Santoso","budi.santoso","leader"]}
            onImport={importUsers}
          />
        }
      >
        <TableToolbar
          search={tc.search} onSearch={tc.setSearch}
          total={tc.total} filteredCount={tc.filteredCount}
          activeFilterCount={tc.activeFilterCount} onClearColFilters={tc.clearColFilters}
        />
        {loading ? (
          <div className="text-sm text-muted-foreground p-4">Memuat…</div>
        ) : (
          <>
          <SortableDataTable cols={USER_COLS} sortIdx={tc.sortIdx} onSort={tc.setSortIdx} colFilters={tc.colFilters} onColFilter={tc.setColFilter}>
            {tc.paged.map(r => (
              <tr key={r.user_id} className="border-b hover:bg-surface-2">
                <td className="px-3 py-2 font-medium text-sm">{r.display_name ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.email}</td>
                <td className="px-3 py-2">
                  {r.username ? (
                    <span className="inline-flex items-center gap-1 text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                      <AtSign className="h-2.5 w-2.5" />{r.username}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1 flex-wrap">
                    {r.roles.length === 0
                      ? <span className="chip">no role</span>
                      : r.roles.map(role => (
                          <span key={role} className={`chip ${
                            role === "super_admin" ? "chip-info"
                            : role === "leader"    ? "chip-success"
                            : "chip-warning"
                          }`}>
                            {role}
                          </span>
                        ))
                    }
                  </div>
                </td>
                <td className="px-3 py-2">
                  <RowActions>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteUser(r)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </RowActions>
                </td>
              </tr>
            ))}
            {tc.paged.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-muted-foreground text-sm">
                  {tc.search ? "Tidak ada hasil" : "Belum ada user"}
                </td>
              </tr>
            )}
          </SortableDataTable>
          <Pager page={tc.page} totalPages={tc.totalPages} onChange={tc.setPage} filteredCount={tc.filteredCount} total={tc.total} pageSize={tc.pageSize} onPageSizeChange={tc.setPageSize} />
          </>
        )}
      </AdminSection>

      {/* ── Modal Tambah User ── */}
      <AddUserModal open={addOpen} onOpenChange={setAddOpen} onSuccess={load} />

      <EditUserModal
        open={editOpen}
        onOpenChange={setEditOpen}
        user={target}
        onSuccess={load}
      />
    </>
  );
}
