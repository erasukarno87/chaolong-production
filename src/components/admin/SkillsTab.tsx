import { useState, useMemo } from "react";
import { AdminSection, DataTable, RowActions, TableToolbar, Pager } from "@/components/admin/AdminSection";
import { useTableControls, PAGE_SIZE, SortOption } from "@/hooks/useTableControls";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Users } from "lucide-react";
import { useTable, useDeleteRow } from "@/hooks/useCrud";
import { CsvButtons } from "@/components/admin/CsvButtons";
import { toBool, toInt } from "@/lib/csv-utils";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SkillFormModal } from "./SkillFormModal";
import { SkillMatrixTab } from "./SkillMatrixTab";

// --- Types -------------------------------------------------------------------
interface Skill {
  id: string; code: string; name: string;
  description: string | null; sort_order: number; active: boolean;
}
interface Process {
  id: string; line_id: string | null; code: string; name: string;
  sort_order: number; cycle_time_seconds: number | null; active: boolean;
}
interface SkillReq {
  id: string; process_id: string; skill_id: string; min_level: number;
  skills: { code: string; name: string } | null;
}
interface OpSkill { operator_id: string; skill_id: string; level: number; }

type SubTab = "master" | "matrix";

// --- Constants ---------------------------------------------------------------
const SKILL_SORT: SortOption<Skill>[] = [
  { label: "Urutan ↑", fn: (a, b) => a.sort_order - b.sort_order },
  { label: "Kode A→Z", fn: (a, b) => a.code.localeCompare(b.code) },
  { label: "Nama A→Z", fn: (a, b) => a.name.localeCompare(b.name) },
];
const SKILL_SEARCH: (keyof Skill)[] = ["code", "name", "description"];

// --- Component ---------------------------------------------------------------
export function SkillsTab() {
  const qc = useQueryClient();
  const [subTab, setSubTab] = useState<SubTab>("master");

  // Data (react-query caches, so matrix sub-tab re-uses same fetches)
  const { data: skills    = [], isLoading } = useTable<Skill>("skills",    { orderBy: "sort_order", ascending: true });
  const tc = useTableControls(skills, SKILL_SEARCH, SKILL_SORT);
  const { data: procs     = [] }            = useTable<Process>("processes",{ orderBy: "sort_order", ascending: true });
  const { data: skillReqs = [] }            = useTable<SkillReq>("process_skill_requirements", {
    select: "id, process_id, skill_id, min_level, skills(code, name)",
    orderBy: "created_at", ascending: true,
  });
  const { data: opSkills = [] } = useTable<OpSkill>("operator_skills", {
    select: "operator_id, skill_id, level",
    orderBy: "skill_id", ascending: true,
  });

  const del = useDeleteRow("skills");

  // Master Skill form — delegate to SkillFormModal
  const [open,      setOpen]      = useState(false);
  const [editSkill, setEditSkill] = useState<Skill | null>(null);

  const startAdd  = () => { setEditSkill(null); setOpen(true); };
  const startEdit = (s: Skill) => { setEditSkill(s); setOpen(true); };

  // Computed: "Digunakan di" per skill (for table column)
  const skillUsedIn = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const req of skillReqs) {
      const proc = procs.find(p => p.id === req.process_id);
      if (!proc) continue;
      const list = map.get(req.skill_id) ?? [];
      list.push(proc.name);
      map.set(req.skill_id, list);
    }
    return map;
  }, [skillReqs, procs]);

  // Operator count per skill (level > 0)
  const skillOpCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const os of opSkills) {
      if (os.level > 0) map.set(os.skill_id, (map.get(os.skill_id) ?? 0) + 1);
    }
    return map;
  }, [opSkills]);

  // CSV import
  const importSkills = async (rows: Record<string, string>[]) => {
    const toInsert = rows
      .filter(r => r.code?.trim() && r.name?.trim())
      .map((r, i) => ({
        code:        r.code.trim().toUpperCase(),
        name:        r.name.trim(),
        description: r.description?.trim() || null,
        sort_order:  toInt(r.sort_order) ?? (i + 1) * 10,
        active:      toBool(r.active),
      }));
    if (!toInsert.length) return { imported: 0, errors: ["Tidak ada baris valid (code & name wajib)"] };
    const { data, error } = await supabase
      .from("skills")
      .upsert(toInsert, { onConflict: "code" })
      .select();
    if (error) throw new Error(error.message);
    qc.invalidateQueries({ queryKey: ["table", "skills"] });
    return { imported: (data ?? []).length, errors: [] as string[] };
  };

  // JSX
  return (
    <div className="space-y-6">
      {/* Sub-tab switcher */}
      <div className="flex gap-1 rounded-xl border p-1 w-fit bg-muted/40">
        {(["master", "matrix"] as SubTab[]).map(t => (
          <button key={t} type="button" onClick={() => setSubTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              subTab === t
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {t === "master" ? "Master Skill" : "Matrix Kebutuhan"}
          </button>
        ))}
      </div>

      {/* MASTER TAB */}
      {subTab === "master" && (
        <AdminSection
          title="Master Skill"
          description="Daftar semua skill yang dapat dimiliki oleh operator."
          onAdd={startAdd}
          rightSlot={
            <CsvButtons
              templateFilename="template-skills.csv"
              templateHeaders={["code","name","description","sort_order","active"]}
              templateSample={["SKL-01","Nama Skill","Deskripsi opsional",10,"true"]}
              onImport={importSkills}
            />
          }
        >
          <TableToolbar
            search={tc.search} onSearch={tc.setSearch}
            sortOptions={SKILL_SORT.map(o => o.label)} sortIdx={tc.sortIdx} onSort={tc.setSortIdx}
            total={tc.total} filteredCount={tc.filteredCount}
          />
          {isLoading ? (
            <div className="text-sm text-muted-foreground p-4">Memuat…</div>
          ) : (
            <>
              <DataTable headers={["Urut","Kode","Nama / Deskripsi","Dipakai di","Operator","Status",""]}>
                {tc.paged.map(s => {
                  const usedIn  = skillUsedIn.get(s.id) ?? [];
                  const opCount = skillOpCount.get(s.id) ?? 0;
                  return (
                    <tr key={s.id} className="border-b hover:bg-surface-2">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground w-14 text-center">
                        {s.sort_order}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs font-semibold">{s.code}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-sm">{s.name}</div>
                        {s.description && (
                          <div className="text-[11px] text-muted-foreground">{s.description}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {usedIn.length === 0 ? (
                          <span className="text-xs text-muted-foreground/50 italic">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {usedIn.slice(0, 3).map((pname, i) => (
                              <span key={i} className="chip chip-info text-[10px]">{pname}</span>
                            ))}
                            {usedIn.length > 3 && (
                              <span className="chip bg-muted text-muted-foreground text-[10px]">
                                +{usedIn.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-mono">{opCount}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={s.active ? "chip chip-success" : "chip chip-warning"}>
                          {s.active ? "Aktif" : "Non-aktif"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <RowActions>
                          <Button size="icon" variant="ghost" onClick={() => startEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost"
                            onClick={() => confirm(`Hapus skill "${s.name}"?`) && del.mutate(s.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </RowActions>
                      </td>
                    </tr>
                  );
                })}
                {tc.paged.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                      {tc.search ? "Tidak ada hasil" : "Belum ada skill"}
                    </td>
                  </tr>
                )}
              </DataTable>
              <Pager page={tc.page} totalPages={tc.totalPages} onChange={tc.setPage}
                filteredCount={tc.filteredCount} pageSize={PAGE_SIZE} />
            </>
          )}
        </AdminSection>
      )}

      {/* MATRIX TAB */}
      {subTab === "matrix" && <SkillMatrixTab />}

      {/* Form modal: Master Skill */}
      <SkillFormModal open={open} onOpenChange={setOpen} editSkill={editSkill} />
    </div>
  );
}
