import { useState, useMemo } from "react";
import { AdminSection, SortableDataTable, ColDef, RowActions, TableToolbar, Pager } from "@/components/admin/AdminSection";
import { useTableControls, SortOption } from "@/hooks/useTableControls";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, BookOpen, Timer, AlertTriangle, Users } from "lucide-react";
import { useTable, useDeleteRow } from "@/hooks/useCrud";
import { useQueryClient } from "@tanstack/react-query";
import { CsvButtons } from "@/components/admin/CsvButtons";
import { toBool, toInt, toFloat } from "@/lib/csv-utils";
import { supabase } from "@/integrations/supabase/client";
import { ProcessFormModal, type Process, type Line } from "./ProcessFormModal";
import { WorkstationSkillReqModal, fmtCt, type SkillReq } from "./WorkstationSkillReqModal";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Skill        { id: string; code: string; name: string; active: boolean; }
interface OpSkill      { operator_id: string; skill_id: string; level: number; }
interface OpProcAssign { operator_id: string; process_id: string; }

// ─── Constants ───────────────────────────────────────────────────────────────

const PROC_SORT: SortOption<Process>[] = [
  { label: "Urutan ↑", fn: (a, b) => a.sort_order - b.sort_order },
  { label: "Kode A→Z", fn: (a, b) => a.code.localeCompare(b.code) },
  { label: "Nama A→Z", fn: (a, b) => a.name.localeCompare(b.name) },
];

const PROC_COLS: ColDef[] = [
  { label: "Urut",             sortAsc: 0, className: "w-14" },
  { label: "Lini",             className: "w-28" },
  { label: "Kode",             sortAsc: 1, filterKey: "code" },
  { label: "Nama Workstation", sortAsc: 2, filterKey: "name" },
  { label: "Cycle Time",       className: "w-24" },
  { label: "Operator",         className: "w-20" },
  { label: "Skill Req.",       className: "w-20" },
  { label: "Status",           className: "w-20" },
  { label: "",                 className: "w-[80px]" },
];
const PROC_SEARCH: (keyof Process)[] = ["code", "name"];

// ─── Component ───────────────────────────────────────────────────────────────

export function ProcessesTab() {
  const qc = useQueryClient();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: lines     = [] } = useTable<Line>("lines",    { orderBy: "code", ascending: true });
  const { data: skills    = [] } = useTable<Skill>("skills",  { orderBy: "sort_order", ascending: true });
  const { data: procs     = [] } = useTable<Process>("processes", { orderBy: "sort_order", ascending: true });
  const { data: skillReqs = [] } = useTable<SkillReq>("process_skill_requirements", {
    select: "id, process_id, skill_id, min_level, skills(code, name)",
    orderBy: "created_at", ascending: true,
  });
  const { data: opSkills = [] } = useTable<OpSkill>("operator_skills", {
    select: "operator_id, skill_id, level",
    orderBy: "skill_id", ascending: true,
  });
  const { data: opProcs = [] } = useTable<OpProcAssign>("operator_process_assignments", {
    select: "operator_id, process_id",
    orderBy: "created_at", ascending: true,
  });

  const delProc = useDeleteRow("processes");

  // ── Coverage helper ───────────────────────────────────────────────────────
  const getCoverage = useMemo(() => (
    procId: string, skillId: string, minLevel: number,
  ) => {
    const assigned  = opProcs.filter(a => a.process_id === procId).map(a => a.operator_id);
    const qualified = assigned.filter(opId =>
      opSkills.some(s => s.operator_id === opId && s.skill_id === skillId && s.level >= minLevel)
    ).length;
    return { qualified, total: assigned.length };
  }, [opProcs, opSkills]);

  const procHasGap = useMemo(() => (procId: string) =>
    skillReqs.filter(r => r.process_id === procId).some(r => {
      const cov = getCoverage(procId, r.skill_id, r.min_level);
      return cov.total > 0 && cov.qualified < cov.total;
    }),
  [skillReqs, getCoverage]);

  // ── Process form modal ────────────────────────────────────────────────────
  const [procOpen, setProcOpen]       = useState(false);
  const [editProcess, setEditProcess] = useState<Process | null>(null);

  const startAdd  = () => { setEditProcess(null); setProcOpen(true); };
  const startEdit = (p: Process) => { setEditProcess(p); setProcOpen(true); };

  // ── Skill requirements modal ──────────────────────────────────────────────
  const [reqOpen, setReqOpen]         = useState(false);
  const [reqProcess, setReqProcess]   = useState<Process | null>(null);

  const openReqModal = (p: Process) => { setReqProcess(p); setReqOpen(true); };

  // ── Line filter ────────────────────────────────────────────────────────────
  const [lineFilter, setLineFilter] = useState<string>("all");
  const visibleProcs = useMemo(() =>
    lineFilter === "all" ? procs : procs.filter(p => p.line_id === lineFilter),
    [procs, lineFilter],
  );
  const tc = useTableControls(visibleProcs, PROC_SEARCH, PROC_SORT);

  // ── CSV Import ─────────────────────────────────────────────────────────────
  const importProcesses = async (rows: Record<string, string>[]) => {
    const lineMap = new Map(lines.map(l => [l.code.toUpperCase(), l.id]));
    const errors: string[] = [];
    const toInsert = rows
      .filter(r => r.line_code?.trim() && r.code?.trim() && r.name?.trim())
      .map((r, i) => {
        const lid = lineMap.get(r.line_code.trim().toUpperCase());
        if (!lid) { errors.push(`${r.code}: line_code "${r.line_code}" tidak ditemukan`); return null; }
        return {
          line_id: lid, code: r.code.trim().toUpperCase(), name: r.name.trim(),
          cycle_time_seconds: toFloat(r.cycle_time_seconds),
          sort_order: toInt(r.sort_order) ?? (i + 1) * 10, active: toBool(r.active),
        };
      })
      .filter(Boolean) as Record<string, unknown>[];
    if (!toInsert.length) return { imported: 0, errors: errors.length ? errors : ["Tidak ada baris valid"] };
    const { data, error } = await supabase
      .from("processes")
      .upsert(toInsert, { onConflict: "line_id,code" })
      .select();
    if (error) throw new Error(error.message);
    qc.invalidateQueries({ queryKey: ["table", "processes"] });
    return { imported: (data ?? []).length, errors };
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Line filter pills ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground shrink-0">Filter Lini:</span>
        {[{ id: "all", label: "Semua" }, ...lines.map(l => ({ id: l.id, label: l.name }))].map(item => (
          <button key={item.id} onClick={() => setLineFilter(item.id)}
            className={`px-3 py-1 rounded-md text-xs border transition-colors ${
              lineFilter === item.id ? "bg-primary text-white border-primary" : "bg-background hover:bg-accent"
            }`}>
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Workstation table ── */}
      <AdminSection
        title="Workstation"
        description="Setiap workstation milik satu lini. Kode dibuat otomatis dari nama lini + nomor urut."
        onAdd={startAdd}
        rightSlot={
          <CsvButtons
            templateFilename="template-processes.csv"
            templateHeaders={["line_code","code","name","cycle_time_seconds","sort_order","active"]}
            templateSample={["LINE-A","LINE-A-01","Perakitan Awal",60,10,"true"]}
            onImport={importProcesses}
          />
        }
      >
        <TableToolbar
          search={tc.search} onSearch={tc.setSearch}
          total={tc.total} filteredCount={tc.filteredCount}
          activeFilterCount={tc.activeFilterCount} onClearColFilters={tc.clearColFilters}
        />
        <SortableDataTable cols={PROC_COLS} sortIdx={tc.sortIdx} onSort={tc.setSortIdx} colFilters={tc.colFilters} onColFilter={tc.setColFilter}>
          {tc.paged.map(p => {
            const line     = lines.find(l => l.id === p.line_id);
            const reqCount = skillReqs.filter(r => r.process_id === p.id).length;
            const opCount  = new Set(opProcs.filter(a => a.process_id === p.id).map(a => a.operator_id)).size;
            const gap      = procHasGap(p.id);
            return (
              <tr key={p.id} className="border-b hover:bg-surface-2">
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.sort_order}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-xs">{line?.name ?? "—"}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{line?.code ?? ""}</div>
                </td>
                <td className="px-3 py-2 font-mono text-xs font-semibold">{p.code}</td>
                <td className="px-3 py-2 font-medium text-sm">{p.name}</td>
                <td className="px-3 py-2">
                  {p.cycle_time_seconds != null ? (
                    <span className="flex items-center gap-1 font-mono text-xs">
                      <Timer className="h-3 w-3 text-muted-foreground shrink-0" />{fmtCt(p.cycle_time_seconds)}
                    </span>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2">
                  {opCount > 0
                    ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3 shrink-0" />{opCount}</span>
                    : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => openReqModal(p)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <BookOpen className="h-3.5 w-3.5 shrink-0" />
                    {reqCount > 0 ? `${reqCount} skill` : "Tambah"}
                    {gap && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" title="Ada operator belum qualified" />}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <span className={p.active ? "chip chip-success" : "chip chip-warning"}>
                    {p.active ? "Aktif" : "Non-aktif"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <RowActions>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost"
                      onClick={() => confirm(`Hapus workstation "${p.name}"?`) && delProc.mutate(p.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </RowActions>
                </td>
              </tr>
            );
          })}
          {tc.paged.length === 0 && (
            <tr>
              <td colSpan={9} className="text-center py-6 text-muted-foreground text-sm">
                {tc.search ? "Tidak ada hasil" : lineFilter === "all" ? "Belum ada workstation" : "Tidak ada workstation untuk lini ini"}
              </td>
            </tr>
          )}
        </SortableDataTable>
        <Pager page={tc.page} totalPages={tc.totalPages} onChange={tc.setPage} filteredCount={tc.filteredCount} total={tc.total} pageSize={tc.pageSize} onPageSizeChange={tc.setPageSize} />
      </AdminSection>

      {/* ── Workstation form modal ── */}
      <ProcessFormModal
        open={procOpen}
        onOpenChange={setProcOpen}
        editProcess={editProcess}
        lines={lines}
        procs={procs}
      />

      {/* ── Skill requirements modal ── */}
      <WorkstationSkillReqModal
        open={reqOpen}
        onOpenChange={setReqOpen}
        process={reqProcess}
        skillReqs={skillReqs}
        skills={skills}
        procs={procs}
        lines={lines}
        opProcs={opProcs}
        opSkills={opSkills}
        onChanged={() => qc.invalidateQueries({ queryKey: ["table", "process_skill_requirements"] })}
      />

    </div>
  );
}
