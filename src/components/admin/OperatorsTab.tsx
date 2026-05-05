import { useState, useMemo } from "react";
import { AdminSection, SortableDataTable, ColDef, RowActions, TableToolbar, Pager } from "@/components/admin/AdminSection";
import { useTableControls, SortOption } from "@/hooks/useTableControls";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, GraduationCap } from "lucide-react";
import { useTable, useDeleteRow } from "@/hooks/useCrud";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { CsvButtons } from "@/components/admin/CsvButtons";
import { toBool } from "@/lib/csv-utils";
import type {
  Operator, Line, Process, Skill, SkillReq,
  OpLineAssignment, OpProcAssignment, OpSkill, AppRole,
} from "./operators/types";
import { OpAvatar } from "./operators/OpAvatar";
import { OperatorFormModal } from "./operators/OperatorFormModal";
import { SkillMatrixModal } from "./operators/SkillMatrixModal";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table) as any;

const OP_SORT: SortOption<Operator>[] = [
  { label: "Nama A→Z",         fn: (a, b) => a.full_name.localeCompare(b.full_name) },
  { label: "Nama Z→A",         fn: (a, b) => b.full_name.localeCompare(a.full_name) },
  { label: "Kode A→Z",         fn: (a, b) => (a.employee_code ?? "").localeCompare(b.employee_code ?? "") },
  { label: "Bergabung Terbaru", fn: (a, b) => (b.join_date ?? "").localeCompare(a.join_date ?? "") },
  { label: "Bergabung Terlama", fn: (a, b) => (a.join_date ?? "").localeCompare(b.join_date ?? "") },
];

const OP_COLS: ColDef[] = [
  { label: "Operator",            sortAsc: 0, sortDesc: 1, filterKey: "full_name" },
  { label: "Kode",                sortAsc: 2, filterKey: "employee_code" },
  { label: "Jabatan",             filterKey: "position" },
  { label: "Bergabung",           sortAsc: 3, sortDesc: 4 },
  { label: "Default Line",        className: "w-28" },
  { label: "Default Workstation", className: "w-36" },
  { label: "Skills",              className: "w-20" },
  { label: "Status",              className: "w-20" },
  { label: "",                    className: "w-[80px]" },
];
const OP_SEARCH: (keyof Operator)[] = ["full_name", "employee_code", "position"];

export function OperatorsTab() {
  const qc = useQueryClient();

  // ── Data queries ─────────────────────────────────────────────────────────────
  const { data: ops      = [], isLoading } = useTable<Operator>("operators_public",           { orderBy: "full_name",  ascending: true });
  const { data: lines    = [] }             = useTable<Line>("lines",                          { orderBy: "code",       ascending: true });
  const { data: procs    = [] }             = useTable<Process>("processes",                   { orderBy: "sort_order", ascending: true });
  const { data: skills   = [] }             = useTable<Skill>("skills",                        { orderBy: "sort_order", ascending: true });
  const { data: skillReqs = [] }            = useTable<SkillReq>("process_skill_requirements", { orderBy: "skill_id",   ascending: true });
  const { data: opLines  = [] }             = useTable<OpLineAssignment>("operator_line_assignments",    { orderBy: "created_at", ascending: true });
  const { data: opProcs  = [] }             = useTable<OpProcAssignment>("operator_process_assignments", { orderBy: "created_at", ascending: true });
  const { data: opSkills = [] }             = useTable<OpSkill>("operator_skills", {
    select: "id, operator_id, skill_id, level, wi_pass, last_training_date, next_training_date, last_evaluation_date, next_evaluation_date, trainer_notes, skills(code, name)",
    orderBy: "skill_id", ascending: true,
  });
  const del = useDeleteRow("operators", "operators_public");
  const tc  = useTableControls(ops, OP_SEARCH, OP_SORT);

  // ── Form modal state ─────────────────────────────────────────────────────────
  const [formOpen,    setFormOpen]    = useState(false);
  const [editOp,      setEditOp]      = useState<Operator | null>(null);

  const startAdd  = ()              => { setEditOp(null);  setFormOpen(true); };
  const startEdit = (o: Operator)   => { setEditOp(o);     setFormOpen(true); };

  const supervisorOptions = useMemo(
    () => ops.filter(o => o.id !== editOp?.id && o.role === "leader"),
    [ops, editOp],
  );

  // ── Skill matrix modal state ─────────────────────────────────────────────────
  const [skillOpen, setSkillOpen] = useState(false);
  const [skillOp,   setSkillOp]   = useState<Operator | null>(null);

  const openSkillMatrix = (o: Operator) => { setSkillOp(o); setSkillOpen(true); };

  // ── Row helpers ──────────────────────────────────────────────────────────────
  const defaultLineOf  = (id: string) => { const a = opLines.find(x => x.operator_id === id && x.is_default); return a ? (lines.find(l => l.id === a.line_id)?.name ?? "—") : "—"; };
  const defaultPosOf   = (id: string) => { const a = opProcs.find(x => x.operator_id === id && x.is_default); return a ? (procs.find(p => p.id === a.process_id)?.name ?? "—") : "—"; };
  const skillCountOf   = (id: string) => opSkills.filter(s => s.operator_id === id).length;

  // ── CSV Import ───────────────────────────────────────────────────────────────
  const importOperators = async (rows: Record<string, string>[]) => {
    const VALID_ROLES = ["super_admin", "leader", "supervisor", "manager"];
    const errors: string[] = [];
    const toInsert = rows
      .filter(r => r.full_name?.trim())
      .map(r => {
        const role = r.role?.trim().toLowerCase();
        if (role && !VALID_ROLES.includes(role)) { errors.push(`${r.employee_code || r.full_name}: role "${r.role}" tidak valid`); return null; }
        return { full_name: r.full_name.trim(), employee_code: r.employee_code?.trim() || null, initials: r.initials?.trim().toUpperCase().slice(0, 3) || null, role: (VALID_ROLES.includes(role) ? role : "supervisor") as AppRole, active: toBool(r.active), join_date: r.join_date?.trim() || null, position: r.position?.trim() || null };
      })
      .filter(Boolean) as Record<string, unknown>[];
    if (!toInsert.length) return { imported: 0, errors: errors.length ? errors : ["Tidak ada baris valid (full_name wajib)"] };
    const { data, error } = await db("operators").upsert(toInsert, { onConflict: "employee_code", ignoreDuplicates: false }).select();
    if (error) throw new Error(error.message);
    qc.invalidateQueries({ queryKey: ["table", "operators"] });
    return { imported: (data ?? []).length, errors };
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <AdminSection
        title="Operator"
        description="Daftar staf shop-floor dengan penempatan Line/Workstation dan matriks kompetensi"
        onAdd={startAdd}
        rightSlot={
          <CsvButtons
            templateFilename="template-operators.csv"
            templateHeaders={["employee_code","full_name","initials","role","position","join_date","active"]}
            templateSample={["EMP-001","Budi Santoso","BS","supervisor","Operator Mesin","2026-01-15","true"]}
            onImport={importOperators}
          />
        }
      >
        <TableToolbar
          search={tc.search} onSearch={tc.setSearch}
          total={tc.total} filteredCount={tc.filteredCount}
          activeFilterCount={tc.activeFilterCount} onClearColFilters={tc.clearColFilters}
        />
        {isLoading ? (
          <div className="text-sm text-muted-foreground p-4">Memuat…</div>
        ) : (
          <>
            <SortableDataTable cols={OP_COLS} sortIdx={tc.sortIdx} onSort={tc.setSortIdx} colFilters={tc.colFilters} onColFilter={tc.setColFilter}>
              {tc.paged.map(o => (
                <tr key={o.id} className="border-b hover:bg-surface-2">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <OpAvatar op={o} size="sm" />
                      <div>
                        <div className="font-medium text-sm">{o.full_name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{o.role}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{o.employee_code ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{o.position ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {o.join_date ? new Date(o.join_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-3 py-2"><span className="chip chip-info text-[10px]">{defaultLineOf(o.id)}</span></td>
                  <td className="px-3 py-2"><span className="font-mono text-xs">{defaultPosOf(o.id)}</span></td>
                  <td className="px-3 py-2">
                    <button onClick={() => openSkillMatrix(o)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {skillCountOf(o.id) > 0 ? `${skillCountOf(o.id)} skill` : "Tambah"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <span className={o.active ? "chip chip-success" : "chip chip-warning"}>{o.active ? "Aktif" : "Non-aktif"}</span>
                  </td>
                  <td className="px-3 py-2">
                    <RowActions>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(o)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost"
                        onClick={() => confirm(`Hapus operator ${o.full_name}?`) && del.mutate(o.id, {
                          onSuccess: () => {
                            qc.invalidateQueries({ queryKey: ["table", "operator_line_assignments"] });
                            qc.invalidateQueries({ queryKey: ["table", "operator_process_assignments"] });
                            qc.invalidateQueries({ queryKey: ["table", "operator_skills"] });
                          },
                        })}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </RowActions>
                  </td>
                </tr>
              ))}
              {tc.paged.length === 0 && (
                <tr><td colSpan={9} className="text-center py-6 text-muted-foreground text-sm">{tc.search ? "Tidak ada hasil" : "Belum ada operator"}</td></tr>
              )}
            </SortableDataTable>
            <Pager page={tc.page} totalPages={tc.totalPages} onChange={tc.setPage} filteredCount={tc.filteredCount} total={tc.total} pageSize={tc.pageSize} onPageSizeChange={tc.setPageSize} />
          </>
        )}
      </AdminSection>

      <OperatorFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        editOperator={editOp}
        lines={lines}
        procs={procs}
        supervisorOptions={supervisorOptions}
        existingLineAsgn={opLines}
        existingProcAsgn={opProcs}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["table", "operators_public"] });
          toast.success(editOp ? "Operator diperbarui" : "Operator ditambahkan");
        }}
      />

      <SkillMatrixModal
        open={skillOpen}
        onOpenChange={setSkillOpen}
        operator={skillOp}
        lines={lines}
        procs={procs}
        skills={skills}
        skillReqs={skillReqs}
        opSkills={opSkills}
        opLines={opLines}
      />
    </>
  );
}
