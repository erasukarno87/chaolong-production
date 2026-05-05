/**
 * WorkstationSkillReqModal — manage skill requirements for a workstation.
 * Shows current requirements with coverage info; allows add, remove, copy-from.
 */
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormModal } from "@/components/ui/form-modal";
import { Button } from "@/components/ui/button";
import { Plus, X, Copy, Timer, AlertTriangle, Users } from "lucide-react";
import { toast } from "sonner";
import { SKILL_LEVEL_LABEL, SKILL_LEVEL_CHIP, SKILL_LEVEL_DEFAULT_REQ } from "@/lib/skillLevels";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Line    { id: string; code: string; name: string; }
interface Skill   { id: string; code: string; name: string; active: boolean; }
export interface Process {
  id: string; line_id: string | null; code: string; name: string;
  sort_order: number; cycle_time_seconds: number | null; active: boolean;
}
export interface SkillReq {
  id: string; process_id: string; skill_id: string; min_level: number;
  skills: { code: string; name: string } | null;
}
interface OpSkill      { operator_id: string; skill_id: string; level: number; }
interface OpProcAssign { operator_id: string; process_id: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format seconds → "45.0s" or "1m 05s" */
export function fmtCt(s: number | null): string {
  if (s == null) return "—";
  if (s < 60) return `${Number(s).toFixed(1)}s`;
  const m   = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

const LEVEL_DOT = [
  "bg-slate-400", "bg-amber-400", "bg-blue-500", "bg-emerald-500", "bg-violet-500",
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface WorkstationSkillReqModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  process: Process | null;
  skillReqs: SkillReq[];
  skills: Skill[];
  procs: Process[];
  lines: Line[];
  opProcs: OpProcAssign[];
  opSkills: OpSkill[];
  onChanged: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WorkstationSkillReqModal({
  open, onOpenChange, process: reqProcess, skillReqs, skills, procs,
  lines, opProcs, opSkills, onChanged,
}: WorkstationSkillReqModalProps) {
  const qc = useQueryClient();
  const [addSkillId, setAddSkillId] = useState("");
  const [copyFromId, setCopyFromId] = useState("");
  const [saving, setSaving] = useState(false);

  const reqs = useMemo(
    () => skillReqs.filter(r => r.process_id === reqProcess?.id),
    [skillReqs, reqProcess],
  );

  const availableSkills = useMemo(
    () => skills.filter(s => s.active && !reqs.some(r => r.skill_id === s.id)),
    [skills, reqs],
  );

  const effectiveSkillId = addSkillId || availableSkills[0]?.id || "";

  const copySourceProcs = useMemo(
    () => procs.filter(p => p.id !== reqProcess?.id && skillReqs.some(r => r.process_id === p.id)),
    [procs, reqProcess, skillReqs],
  );

  const getCoverage = (procId: string, skillId: string, minLevel: number) => {
    const assigned  = opProcs.filter(a => a.process_id === procId).map(a => a.operator_id);
    const qualified = assigned.filter(opId =>
      opSkills.some(s => s.operator_id === opId && s.skill_id === skillId && s.level >= minLevel)
    ).length;
    return { qualified, total: assigned.length };
  };

  const invalidateReqs = () => {
    qc.invalidateQueries({ queryKey: ["table", "process_skill_requirements"] });
    onChanged();
  };

  const addReq = async () => {
    if (!reqProcess || !effectiveSkillId) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("process_skill_requirements") as any).insert({
        process_id: reqProcess.id, skill_id: effectiveSkillId, min_level: SKILL_LEVEL_DEFAULT_REQ,
      });
      if (error) throw error;
      invalidateReqs();
      toast.success("Skill requirement ditambahkan");
      setAddSkillId("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  const removeReq = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("process_skill_requirements") as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    invalidateReqs();
    toast.success("Dihapus");
  };

  const copyFromProc = async () => {
    if (!reqProcess || !copyFromId) return;
    setSaving(true);
    try {
      const sourceReqs  = skillReqs.filter(r => r.process_id === copyFromId);
      const existingIds = new Set(reqs.map(r => r.skill_id));
      const toInsert    = sourceReqs.filter(r => !existingIds.has(r.skill_id));
      if (toInsert.length === 0) { toast.info("Tidak ada skill baru untuk disalin (semua sudah ada)"); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("process_skill_requirements") as any).insert(
        toInsert.map(r => ({ process_id: reqProcess.id, skill_id: r.skill_id, min_level: r.min_level })),
      );
      if (error) throw error;
      invalidateReqs();
      toast.success(`${toInsert.length} skill berhasil disalin`);
      setCopyFromId("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyalin");
    } finally { setSaving(false); }
  };

  return (
    <FormModal open={open} onOpenChange={onOpenChange} size="2xl"
      title="" hideFooter onSubmit={() => onOpenChange(false)} busy={false}>

      {/* Gradient header */}
      <div className="-mx-6 -mt-6 mb-4 px-6 py-4 gradient-primary rounded-t-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-white/70 uppercase tracking-widest">
                {lines.find(l => l.id === reqProcess?.line_id)?.name ?? "—"}
              </span>
              <span className="text-white/50 text-xs">›</span>
              <span className="font-mono text-sm font-bold text-white">{reqProcess?.code}</span>
            </div>
            <div className="text-white font-semibold text-base leading-tight mt-0.5 truncate">{reqProcess?.name}</div>
            {reqProcess?.cycle_time_seconds != null && (
              <div className="flex items-center gap-1 mt-1 text-white/70 text-xs">
                <Timer className="h-3 w-3" />CT: {fmtCt(reqProcess.cycle_time_seconds)}
              </div>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <span className="text-3xl font-black text-white/20 leading-none">{reqs.length}</span>
            <span className="text-white/60 text-[10px] uppercase tracking-widest">skill req.</span>
          </div>
        </div>
      </div>

      {/* Two-panel body */}
      <div className="grid grid-cols-[1fr_260px] gap-5 min-h-0">

        {/* ── LEFT: skill list with coverage ── */}
        <div className="space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Skill Requirements ({reqs.length})</span>
            <span className="text-xs text-muted-foreground">
              Operator assigned: {new Set(opProcs.filter(a => a.process_id === reqProcess?.id).map(a => a.operator_id)).size}
            </span>
          </div>
          <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: "360px" }}>
            {reqs.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                Belum ada skill requirement.
              </div>
            ) : (
              reqs.map(req => {
                const cov    = getCoverage(reqProcess!.id, req.skill_id, req.min_level);
                const hasGap = cov.total > 0 && cov.qualified < cov.total;
                return (
                  <div key={req.id}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                      hasGap ? "border-amber-300 bg-amber-50/60" : "bg-surface-2"
                    }`}>
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${LEVEL_DOT[req.min_level] ?? "bg-slate-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{req.skills?.name ?? req.skill_id}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-medium ${SKILL_LEVEL_CHIP[req.min_level]}`}>
                          Min. L{req.min_level} — {SKILL_LEVEL_LABEL[req.min_level]}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      {cov.total > 0 ? (
                        <span className={`flex items-center gap-1 text-xs font-medium ${hasGap ? "text-amber-600" : "text-emerald-600"}`}>
                          {hasGap && <AlertTriangle className="h-3 w-3" />}
                          <Users className="h-3 w-3" />{cov.qualified}/{cov.total}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50">—</span>
                      )}
                    </div>
                    <Button size="icon" variant="ghost"
                      className="h-6 w-6 shrink-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeReq(req.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Add skill + Copy from process ── */}
        <div className="space-y-4 shrink-0">
          <div className="space-y-2 rounded-lg border px-3 py-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/70">
              <Plus className="h-3.5 w-3.5" />Tambah Skill
            </div>
            <select className="w-full h-8 rounded border bg-background text-xs px-2"
              value={addSkillId} onChange={e => setAddSkillId(e.target.value)}>
              {availableSkills.length === 0
                ? <option value="">— Semua skill sudah ditambahkan —</option>
                : <>
                  <option value="">— {availableSkills[0]?.name ?? "Pilih skill"} —</option>
                  {availableSkills.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                </>
              }
            </select>
            <Button size="sm" className="w-full text-xs h-8 gap-1"
              disabled={availableSkills.length === 0 || saving} onClick={addReq}>
              <Plus className="h-3 w-3" />{saving ? "Menyimpan…" : "Tambah"}
            </Button>
          </div>

          <div className="space-y-2 rounded-lg border px-3 py-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/70">
              <Copy className="h-3.5 w-3.5" />Salin dari Workstation Lain
            </div>
            <select className="w-full h-8 rounded border bg-background text-xs px-2"
              value={copyFromId} onChange={e => setCopyFromId(e.target.value)}>
              <option value="">— Pilih sumber —</option>
              {copySourceProcs.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
            <Button size="sm" variant="outline" className="w-full text-xs h-8 gap-1"
              disabled={!copyFromId || saving} onClick={copyFromProc}>
              <Copy className="h-3 w-3" />{saving ? "Menyalin…" : "Salin Skill"}
            </Button>
            <p className="text-[10px] text-muted-foreground">Skill yang sudah ada tidak akan ditimpa.</p>
          </div>
        </div>

      </div>
    </FormModal>
  );
}
