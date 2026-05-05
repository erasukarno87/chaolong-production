/**
 * SkillMatrixTab — displays skill requirements matrix per workstation.
 * Shows which skills are needed at each process and at what minimum level.
 * Allows adding/removing individual skill requirements.
 */
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTable } from "@/hooks/useCrud";
import { AdminSection } from "@/components/admin/AdminSection";
import { FormModal } from "@/components/ui/form-modal";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  SKILL_LEVEL_LABEL, SKILL_LEVEL_CHIP, SKILL_LEVEL_DEFAULT_REQ,
} from "@/lib/skillLevels";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Line  { id: string; code: string; name: string; }
interface Skill { id: string; code: string; name: string; active: boolean; }
interface Process {
  id: string; line_id: string | null; code: string; name: string;
  sort_order: number; cycle_time_seconds: number | null; active: boolean;
}
interface SkillReq {
  id: string; process_id: string; skill_id: string; min_level: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_LEVEL_BADGE: Record<number, string> = {
  0: "bg-slate-100 text-slate-600",
  1: "bg-amber-100 text-amber-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-emerald-100 text-emerald-700",
  4: "bg-violet-100 text-violet-700",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SkillMatrixTab() {
  const qc = useQueryClient();

  const { data: lines     = [] } = useTable<Line>("lines",    { orderBy: "code", ascending: true });
  const { data: procs     = [] } = useTable<Process>("processes", { orderBy: "sort_order", ascending: true });
  const { data: skills    = [] } = useTable<Skill>("skills",  { orderBy: "sort_order", ascending: true });
  const { data: skillReqs = [] } = useTable<SkillReq>("process_skill_requirements", {
    select: "id, process_id, skill_id, min_level",
    orderBy: "created_at", ascending: true,
  });

  const [matrixLineId, setMatrixLineId] = useState<string | null>(null);
  const [reqModal, setReqModal] = useState<{ processId: string; processName: string } | null>(null);
  const [reqForm,  setReqForm]  = useState<{ skill_id: string; min_level: number }>({
    skill_id: "", min_level: SKILL_LEVEL_DEFAULT_REQ,
  });

  const matrixProcs = useMemo(() => {
    const base = procs.filter(p => p.active);
    return matrixLineId ? base.filter(p => p.line_id === matrixLineId) : base;
  }, [procs, matrixLineId]);

  const activeSkills = useMemo(() => skills.filter(s => s.active), [skills]);

  const upsertReq = async () => {
    if (!reqModal || !reqForm.skill_id) { toast.error("Pilih skill terlebih dahulu"); return; }
    const existing = skillReqs.find(
      r => r.process_id === reqModal.processId && r.skill_id === reqForm.skill_id,
    );
    const op = existing
      ? (supabase.from("process_skill_requirements") as any).update({ min_level: reqForm.min_level }).eq("id", existing.id)
      : (supabase.from("process_skill_requirements") as any).insert({ process_id: reqModal.processId, skill_id: reqForm.skill_id, min_level: reqForm.min_level });
    const { error } = await op;
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["table", "process_skill_requirements"] });
    toast.success("Tersimpan");
    setReqModal(null);
  };

  const deleteReq = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("process_skill_requirements") as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["table", "process_skill_requirements"] });
    toast.success("Dihapus");
  };

  return (
    <AdminSection
      title="Matrix Kebutuhan Skill"
      description="Skill apa saja yang diperlukan di setiap Workstation dan level minimumnya."
    >
      {/* Line filter */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button type="button" onClick={() => setMatrixLineId(null)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
            !matrixLineId
              ? "border-primary bg-blue-50 text-primary shadow-sm"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}>
          Semua Line
        </button>
        {lines.map(l => (
          <button key={l.id} type="button" onClick={() => setMatrixLineId(l.id)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              matrixLineId === l.id
                ? "border-primary bg-blue-50 text-primary shadow-sm"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}>
            {l.code}
          </button>
        ))}
      </div>

      {matrixProcs.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Belum ada Workstation aktif di line ini.</div>
      ) : activeSkills.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Belum ada skill aktif. Tambahkan di tab Master Skill.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground sticky left-0 bg-slate-50 min-w-[180px] z-10 border-r">
                  Workstation
                </th>
                {activeSkills.map(s => (
                  <th key={s.id} className="px-2 py-2 text-center font-semibold text-muted-foreground min-w-[72px] border-r last:border-r-0">
                    <div className="font-mono text-[10px]">{s.code}</div>
                    <div className="text-[10px] font-normal truncate max-w-[64px] mx-auto" title={s.name}>{s.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixProcs.map(proc => {
                const line = lines.find(l => l.id === proc.line_id);
                return (
                  <tr key={proc.id} className="border-b hover:bg-slate-50/60">
                    <td className="px-3 py-2 sticky left-0 bg-white border-r z-10">
                      <div className="font-medium text-sm">{proc.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {line?.code ?? ""} · <span className="font-mono">{proc.code}</span>
                      </div>
                    </td>
                    {activeSkills.map(s => {
                      const req = skillReqs.find(r => r.process_id === proc.id && r.skill_id === s.id);
                      return (
                        <td key={s.id} className="px-2 py-2 text-center border-r last:border-r-0">
                          {req ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${MIN_LEVEL_BADGE[req.min_level] ?? MIN_LEVEL_BADGE[0]}`}>
                                {SKILL_LEVEL_LABEL[req.min_level] ?? `Lv${req.min_level}`}
                              </span>
                              <button type="button"
                                onClick={() => confirm(`Hapus kebutuhan "${s.code}" dari "${proc.name}"?`) && deleteReq(req.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                title="Hapus requirement">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          ) : (
                            <button type="button"
                              onClick={() => {
                                setReqForm({ skill_id: s.id, min_level: SKILL_LEVEL_DEFAULT_REQ });
                                setReqModal({ processId: proc.id, processName: proc.name });
                              }}
                              className="h-6 w-6 rounded-md border border-dashed border-slate-300 text-slate-400 hover:border-primary hover:text-primary transition-colors grid place-items-center mx-auto"
                              title={`Tambah requirement ${s.code}`}>
                              <Plus className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: tambah/edit requirement */}
      {reqModal && (
        <FormModal open={!!reqModal} onOpenChange={() => setReqModal(null)}
          title={`Kebutuhan Skill — ${reqModal.processName}`}
          size="sm" onSubmit={upsertReq} submitLabel="Simpan">
          <div className="space-y-1.5">
            <Label>Skill <span className="text-destructive">*</span></Label>
            <select className="h-10 w-full rounded-xl border bg-slate-50 px-3 text-sm outline-none focus:border-primary focus:bg-white"
              value={reqForm.skill_id} onChange={e => setReqForm(f => ({ ...f, skill_id: e.target.value }))}>
              <option value="">— Pilih skill —</option>
              {activeSkills.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Level Minimum</Label>
            <div className="flex gap-2">
              {([0, 1, 2, 3, 4] as number[]).map(lv => (
                <button key={lv} type="button"
                  onClick={() => setReqForm(f => ({ ...f, min_level: lv }))}
                  className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-colors ${
                    reqForm.min_level === lv
                      ? `${SKILL_LEVEL_CHIP[lv]} border-transparent shadow-sm`
                      : "border-border text-muted-foreground hover:border-primary"
                  }`}>
                  {lv}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{SKILL_LEVEL_LABEL[reqForm.min_level]}</p>
          </div>
        </FormModal>
      )}
    </AdminSection>
  );
}
