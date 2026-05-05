/**
 * GroupsTab — Kelola Group (regu) per Line Produksi.
 *
 * Hierarki:
 *   Line  →  Group (bisa 1-N per line, bebas rotasi shift)
 *              ├── group_leaders         (Leader = auth user dengan role leader)
 *              └── group_process_assignments  (formasi default: operator → POS)
 *
 * Aturan bisnis:
 *   - Group TIDAK terikat ke Shift tertentu.
 *   - Leader group adalah USER dengan role leader (bukan record di tabel operators).
 *   - Operator/formasi POS tetap menggunakan tabel operators.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTable } from "@/hooks/useCrud";
import { AdminSection, TableToolbar, Pager } from "@/components/admin/AdminSection";
import { useTableControls, SortOption } from "@/hooks/useTableControls";
import { CsvButtons } from "@/components/admin/CsvButtons";
import { toBool, toInt } from "@/lib/csv-utils";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  GroupCard,
  type Group, type Line, type Operator, type Process, type LeaderProfile,
} from "./GroupCard";

// ─── Typed Database Response Interfaces ───────────────────────────────────────

interface LeaderProfileDB {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

interface GroupLeaderDB {
  id: string;
  user_id: string;
  profiles: LeaderProfileDB;
}

interface ProcessDB {
  id: string;
  code: string;
  name: string;
  sort_order: number;
}

interface OperatorDB {
  id: string;
  full_name: string;
  employee_code: string | null;
  initials: string | null;
  avatar_color: string | null;
}

interface GroupProcessAssignmentDB {
  id: string;
  process_id: string;
  operator_id: string;
  processes: ProcessDB;
  operators: OperatorDB;
}

interface GroupDBResponse {
  id: string;
  line_id: string;
  code: string;
  sort_order: number;
  active: boolean;
  group_leaders: GroupLeaderDB[];
  group_process_assignments: GroupProcessAssignmentDB[];
}

interface ProcessDBResponse {
  id: string;
  code: string;
  name: string;
  sort_order: number;
}

interface UserRoleDB {
  user_id: string;
}

interface ProfileDB {
  user_id: string;
  display_name: string | null;
  email: string | null;
}


// ─── Hooks ────────────────────────────────────────────────────────────────────

function useGroups(lineId: string | null) {
  return useQuery<Group[]>({
    queryKey: ["groups", lineId],
    queryFn: async () => {
      if (!lineId) return [];
      const { data, error } = await supabase
        .from("groups")
        .select(`
          *,
          group_leaders(
            id, user_id,
            profiles(user_id, display_name, email)
          ),
          group_process_assignments(
            id, process_id, operator_id,
            processes(id, code, name, sort_order),
            operators(id, full_name, employee_code, initials, avatar_color)
          )
        `)
        .eq("line_id", lineId)
        .order("sort_order")
        .returns<GroupDBResponse[]>();
      if (error) throw error;
      return (data ?? []) as Group[];
    },
    enabled: !!lineId,
  });
}

function useLineProcesses(lineId: string | null) {
  return useQuery<Process[]>({
    queryKey: ["processes-for-line", lineId],
    queryFn: async () => {
      if (!lineId) return [];
      const { data, error } = await supabase
        .from("processes")
        .select("id, code, name, sort_order")
        .eq("line_id", lineId)
        .eq("active", true)
        .order("sort_order")
        .returns<ProcessDBResponse[]>();
      if (error) throw error;
      return (data ?? []) as Process[];
    },
    enabled: !!lineId,
  });
}

/** Ambil semua users yang punya role leader atau super_admin */
function useLeaderUsers() {
  return useQuery<LeaderProfile[]>({
    queryKey: ["leader-users"],
    queryFn: async () => {
      // 1. Ambil user_ids yang ber-role leader / super_admin
      const { data: roles, error: re } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["leader", "super_admin"])
        .returns<UserRoleDB[]>();
      if (re) throw re;
      const userIds = (roles ?? []).map(r => r.user_id);
      if (userIds.length === 0) return [];

      // 2. Ambil profiles untuk user_ids tersebut
      const { data: profiles, error: pe } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", userIds)
        .order("display_name")
        .returns<ProfileDB[]>();
      if (pe) throw pe;
      return (profiles ?? []) as LeaderProfile[];
    },
  });
}


// ─── Main Tab ─────────────────────────────────────────────────────────────────

const emptyGroupForm = (): { id?: string; code: string; sort_order: number; active: boolean } => ({
  code: "", sort_order: 0, active: true,
});


const GROUP_SORT: SortOption<Group>[] = [
  { label: "Urutan ↑",  fn: (a, b) => a.sort_order - b.sort_order },
  { label: "Kode A→Z",  fn: (a, b) => a.code.localeCompare(b.code) },
];

export function GroupsTab() {
  const qc = useQueryClient();
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [groupModal, setGroupModal] = useState(false);
  const [groupForm, setGroupForm]   = useState(emptyGroupForm());
  const [groupErrors, setGroupErrors] = useState<Record<string, string>>({});
  const clearGroupErr = (f: string) => setGroupErrors(e => { const n = { ...e }; delete n[f]; return n; });
  const groupErrCls   = (f: string) => groupErrors[f] ? "border-destructive focus-visible:ring-destructive" : "";

  const { data: lines       = [] } = useTable<Line>("lines",  { orderBy: "code", ascending: true });
  const { data: operators   = [] } = useTable<Operator>("operators", { orderBy: "full_name", ascending: true });
  const { data: leaderUsers = [] } = useLeaderUsers();
  const { data: groups      = [], refetch: refetchGroups } = useGroups(selectedLineId);
  const tc = useTableControls(groups, ["code"] as (keyof Group)[], GROUP_SORT);
  const { data: lineProcesses = [] } = useLineProcesses(selectedLineId);

  const effectiveLineId = selectedLineId ?? (lines[0]?.id ?? null);
  const selectedLine    = lines.find(l => l.id === effectiveLineId);

  // ── Group upsert ──
  const upsertGroup = useMutation({
    mutationFn: async (form: typeof groupForm & { line_id: string }) => {
      const { id, ...rest } = form;
      if (id) {
        const { data, error } = await supabase
          .from("groups")
          .update(rest)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("groups")
          .insert(rest)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success("Tersimpan");
      qc.invalidateQueries({ queryKey: ["groups"] });
      setGroupModal(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Group delete ──
  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Group dihapus"); qc.invalidateQueries({ queryKey: ["groups"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openAdd  = () => {
    const maxSort = groups.length ? Math.max(...groups.map(g => g.sort_order)) : 0;
    setGroupForm({ ...emptyGroupForm(), sort_order: maxSort + 10 });
    setGroupErrors({});
    setGroupModal(true);
  };
  const openEdit = (g: Group) => {
    setGroupForm({ id: g.id, code: g.code, sort_order: g.sort_order, active: g.active });
    setGroupErrors({});
    setGroupModal(true);
  };

  const handleSubmit = () => {
    const newErr: Record<string, string> = {};
    if (!groupForm.code.trim()) newErr.code = "Kode group wajib diisi";
    if (!effectiveLineId)       newErr.line_id = "Pilih lini terlebih dahulu";
    if (Object.keys(newErr).length > 0) { setGroupErrors(newErr); return; }
    upsertGroup.mutate({ ...groupForm, line_id: effectiveLineId! });
  };

  // ── CSV Import ─────────────────────────────────────────────────────────
  const importGroups = async (rows: Record<string, string>[]) => {
    const lineMap = new Map(lines.map(l => [l.code.toUpperCase(), l.id]));
    const errors: string[] = [];
    const toInsert = rows
      .filter(r => r.line_code?.trim() && r.code?.trim())
      .map((r, i) => {
        const lid = lineMap.get(r.line_code.trim().toUpperCase());
        if (!lid) { errors.push(`${r.code}: line_code "${r.line_code}" tidak ditemukan`); return null; }
        return { line_id: lid, code: r.code.trim().toUpperCase(), sort_order: toInt(r.sort_order) ?? (i + 1) * 10, active: toBool(r.active) };
      })
      .filter(Boolean) as Record<string, unknown>[];
    if (!toInsert.length) return { imported: 0, errors: errors.length ? errors : ["Tidak ada baris valid"] };
    const { data, error } = await supabase
      .from("groups")
      .upsert(toInsert, { onConflict: "line_id,code" })
      .select();
    if (error) throw new Error(error.message);
    qc.invalidateQueries({ queryKey: ["groups"] });
    return { imported: (data ?? []).length, errors };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Group / Regu Shift</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Setiap Line memiliki 1–N Group yang masing-masing bisa bertugas di Shift mana pun.
          Atur Leader (akun login) dan formasi default operator per Workstation di sini.
        </p>
      </div>

      {/* ── Line selector ── */}
      <div className="flex flex-wrap gap-2">
        {lines.map(line => (
          <button
            key={line.id}
            type="button"
            onClick={() => setSelectedLineId(line.id)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
              (effectiveLineId === line.id)
                ? "border-primary bg-blue-50 text-primary shadow-sm"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${line.active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
            {line.code}
          </button>
        ))}
        {lines.length === 0 && <p className="text-sm text-muted-foreground">Belum ada lini. Tambahkan di tab Lini Produksi.</p>}
      </div>

      {/* ── Group list ── */}
      {effectiveLineId && (
        <AdminSection
          title={`Group — ${selectedLine?.name ?? selectedLine?.code ?? ""}`}
          description="Kelola regu shift untuk lini ini. Setiap regu bisa punya Leader dan formasi operator berbeda."
          onAdd={openAdd}
          rightSlot={
            <CsvButtons
              templateFilename="template-groups.csv"
              templateHeaders={["line_code","code","sort_order","active"]}
              templateSample={["LINE-A","GRP-A",10,"true"]}
              onImport={importGroups}
            />
          }
        >
          <TableToolbar
            search={tc.search} onSearch={tc.setSearch}
            total={tc.total} filteredCount={tc.filteredCount}
            activeFilterCount={tc.activeFilterCount} onClearColFilters={tc.clearColFilters}
          />
          <div className="space-y-3">
            {tc.paged.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Belum ada group untuk lini ini. Klik "+ Tambah"
              </div>
            ) : (
              tc.paged.map(group => (
                <GroupCard
                  key={group.id}
                  group={group}
                  lineProcesses={lineProcesses}
                  allOperators={operators}
                  leaderUsers={leaderUsers}
                  onEdit={openEdit}
                  onDelete={g => confirm(`Hapus group "${g.code}"?`) && deleteGroup.mutate(g.id)}
                  onRefresh={refetchGroups}
                />
              ))
            )}
          </div>
          <Pager page={tc.page} totalPages={tc.totalPages} onChange={tc.setPage}
            filteredCount={tc.filteredCount} total={tc.total} pageSize={tc.pageSize} onPageSizeChange={tc.setPageSize} />
        </AdminSection>
      )}

      {/* ── Modal: form group ── */}
      <FormModal
        open={groupModal}
        onOpenChange={setGroupModal}
        title={groupForm.id ? "Edit Group" : "Tambah Group"}
        onSubmit={handleSubmit}
        busy={upsertGroup.isPending}
      >
        <div className="space-y-1.5">
          <Label>Kode Group <span className="text-destructive">*</span></Label>
          <Input
            value={groupForm.code}
            placeholder="GRP-A"
            className={groupErrCls("code")}
            onChange={e => { clearGroupErr("code"); setGroupForm(f => ({ ...f, code: e.target.value.toUpperCase() })); }}
          />
          {groupErrors.code && <p className="text-[11px] text-destructive">{groupErrors.code}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Urutan Tampil</Label>
            <Input
              type="number" min={0}
              value={groupForm.sort_order}
              onChange={e => setGroupForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="flex items-end justify-between pb-0.5">
            <Label>Aktif</Label>
            <Switch
              checked={groupForm.active}
              onCheckedChange={v => setGroupForm(f => ({ ...f, active: v }))}
            />
          </div>
        </div>
      </FormModal>
    </div>
  );
}
