import { useState, useMemo, useEffect } from "react";
import { FormModal } from "@/components/ui/form-modal";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { SKILL_LEVEL_LABEL } from "@/lib/skillLevels";
import type { Operator, Line, Process, Skill, SkillReq, OpSkill, OpLineAssignment, SkillDraftRow } from "./types";
import { OpAvatar } from "./OpAvatar";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table) as any;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  operator: Operator | null;
  lines: Line[];
  procs: Process[];
  skills: Skill[];
  skillReqs: SkillReq[];
  opSkills: OpSkill[];
  opLines: OpLineAssignment[];
}

export function SkillMatrixModal({
  open, onOpenChange, operator,
  lines, procs, skills, skillReqs, opSkills, opLines,
}: Props) {
  const qc = useQueryClient();
  const [draft,         setDraft]         = useState<Map<string, SkillDraftRow>>(new Map());
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [draftDirty,    setDraftDirty]    = useState(false);
  const [savingSkill,   setSavingSkill]   = useState(false);

  const handleOpenChange = (v: boolean) => {
    if (!v && draftDirty && !confirm("Perubahan belum disimpan. Tutup tanpa menyimpan?")) return;
    onOpenChange(v);
  };

  // Re-init draft whenever the modal opens or the operator changes
  useEffect(() => {
    if (!open || !operator) return;
    const newDraft = new Map<string, SkillDraftRow>();
    opSkills.filter(s => s.operator_id === operator.id).forEach(s => {
      newDraft.set(s.skill_id, { skillId: s.skill_id, has: true, level: s.level, wi_pass: s.wi_pass, existingId: s.id });
    });
    setDraft(newDraft);
    setShowAllSkills(false);
    setDraftDirty(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, operator?.id]);

  const updateDraft = (skillId: string, changes: Partial<SkillDraftRow>) => {
    setDraft(prev => {
      const next = new Map(prev);
      const existing = next.get(skillId) ?? { skillId, has: false, level: 0, wi_pass: false, existingId: null };
      next.set(skillId, { ...existing, ...changes });
      return next;
    });
    setDraftDirty(true);
  };

  const saveDraft = async () => {
    if (!operator) return;
    setSavingSkill(true);
    try {
      const toInsert: object[] = [];
      const toUpdate: { id: string; data: object }[] = [];
      const toDelete: string[] = [];
      for (const row of draft.values()) {
        if (row.has) {
          const data = { level: row.level, wi_pass: row.wi_pass, updated_at: new Date().toISOString() };
          if (row.existingId) toUpdate.push({ id: row.existingId, data });
          else toInsert.push({ operator_id: operator.id, skill_id: row.skillId, level: row.level, wi_pass: row.wi_pass });
        } else if (row.existingId) {
          toDelete.push(row.existingId);
        }
      }
      if (toDelete.length > 0) { const { error } = await db("operator_skills").delete().in("id", toDelete); if (error) throw error; }
      for (const u of toUpdate) { const { error } = await db("operator_skills").update(u.data).eq("id", (u as { id: string }).id); if (error) throw error; }
      if (toInsert.length > 0) { const { error } = await db("operator_skills").insert(toInsert); if (error) throw error; }
      qc.invalidateQueries({ queryKey: ["table", "operator_skills"] });
      const parts = [];
      if (toInsert.length) parts.push(`${toInsert.length} baru`);
      if (toUpdate.length) parts.push(`${toUpdate.length} diperbarui`);
      if (toDelete.length) parts.push(`${toDelete.length} dihapus`);
      toast.success("Skill disimpan" + (parts.length ? ` — ${parts.join(", ")}` : ""));
      setDraftDirty(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally { setSavingSkill(false); }
  };

  // ── Computed ─────────────────────────────────────────────────────────────────
  const defaultLineIds = useMemo(() => {
    if (!operator) return [];
    return opLines.filter(a => a.operator_id === operator.id && a.is_default).map(a => a.line_id);
  }, [opLines, operator]);

  const defaultLineNames = useMemo(() =>
    defaultLineIds.map(id => lines.find(l => l.id === id)?.name ?? id).join(", "),
    [defaultLineIds, lines],
  );

  const defaultLineProcs = useMemo(() =>
    procs.filter(p => p.line_id && defaultLineIds.includes(p.line_id)),
    [procs, defaultLineIds],
  );

  const defaultLineSkillIds = useMemo(() => {
    const ids = new Set<string>();
    skillReqs.forEach(r => { if (defaultLineProcs.some(p => p.id === r.process_id)) ids.add(r.skill_id); });
    return ids;
  }, [skillReqs, defaultLineProcs]);

  const displaySkills = useMemo(() => {
    if (!operator) return [];
    const mySkillIds = new Set(opSkills.filter(s => s.operator_id === operator.id).map(s => s.skill_id));
    if (showAllSkills) return skills.filter(s => s.active);
    return skills.filter(s => s.active && (defaultLineSkillIds.has(s.id) || mySkillIds.has(s.id)));
  }, [skills, operator, opSkills, showAllSkills, defaultLineSkillIds]);

  const modalStats = useMemo(() => {
    if (!operator) return { owned: 0, fulfilled: 0, required: 0 };
    const myOpSkills = opSkills.filter(s => s.operator_id === operator.id);
    const owned = myOpSkills.length;
    const required = defaultLineSkillIds.size;
    let fulfilled = 0;
    for (const skillId of defaultLineSkillIds) {
      const reqs   = skillReqs.filter(r => r.skill_id === skillId && defaultLineProcs.some(p => p.id === r.process_id));
      const maxMin = reqs.length > 0 ? Math.max(...reqs.map(r => r.min_level)) : 0;
      const opSk   = myOpSkills.find(s => s.skill_id === skillId);
      if (opSk && opSk.level >= maxMin) fulfilled++;
    }
    return { owned, fulfilled, required };
  }, [operator, opSkills, defaultLineSkillIds, skillReqs, defaultLineProcs]);

  // Expose initDraft so parent can call it
  // (parent uses a ref passed via onOpen, or we handle via useEffect)
  // We actually handle this with the open prop + a dedicated openSkillMatrix callback in parent

  return (
    <FormModal open={open} onOpenChange={handleOpenChange} size="2xl" title="" hideFooter onSubmit={() => onOpenChange(false)}>
      {/* Gradient header */}
      <div className="-mx-6 -mt-6 mb-4 px-6 py-4 gradient-primary rounded-t-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {operator && <OpAvatar op={operator} size="lg" />}
            <div className="min-w-0">
              <div className="font-bold text-white text-base leading-tight truncate">{operator?.full_name}</div>
              <div className="text-white/70 text-xs mt-0.5">{operator?.position ?? operator?.role}</div>
              {defaultLineNames && (
                <div className="mt-1.5">
                  <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">★ {defaultLineNames}</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-white font-bold text-sm">{modalStats.owned} skill dimiliki</div>
            {modalStats.required > 0 ? (
              <div className={`text-xs mt-0.5 font-semibold ${modalStats.fulfilled === modalStats.required ? "text-emerald-300" : "text-amber-300"}`}>
                {modalStats.fulfilled}/{modalStats.required} skill line terpenuhi
              </div>
            ) : (
              <div className="text-white/50 text-xs mt-0.5">Tidak ada requirement di line</div>
            )}
          </div>
        </div>
      </div>

      {/* Toggle view */}
      <div className="flex items-center gap-2 mb-3">
        <button type="button" onClick={() => setShowAllSkills(false)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            !showAllSkills ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted-foreground hover:bg-accent"
          }`}>
          Skill Line Default ({defaultLineSkillIds.size})
        </button>
        <button type="button" onClick={() => setShowAllSkills(true)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            showAllSkills ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted-foreground hover:bg-accent"
          }`}>
          Semua Skill ({skills.filter(s => s.active).length})
        </button>
        <div className="flex-1" />
        {draftDirty && (
          <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 font-medium">Ada perubahan</span>
        )}
      </div>

      {/* Skill table */}
      <div className="overflow-auto rounded-lg border" style={{ maxHeight: "380px" }}>
        <table className="w-full text-sm">
          <thead className="bg-surface-2 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 w-8 text-center"><span className="sr-only">Miliki</span></th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Skill</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Diperlukan di Workstation</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Level</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-12">WI</th>
            </tr>
          </thead>
          <tbody>
            {displaySkills.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-muted-foreground text-xs">
                  {showAllSkills ? "Belum ada skill terdaftar di sistem." : "Tidak ada skill requirement di line default. Gunakan tab \"Semua Skill\" untuk menambahkan secara manual."}
                </td>
              </tr>
            )}
            {displaySkills.map(s => {
              const row      = draft.get(s.id) ?? { skillId: s.id, has: false, level: 0, wi_pass: false, existingId: null };
              const hasSkill = row.has;
              const reqList  = skillReqs.filter(r => r.skill_id === s.id && defaultLineProcs.some(p => p.id === r.process_id));
              const maxMin   = reqList.length > 0 ? Math.max(...reqList.map(r => r.min_level)) : null;
              const isFulfilled = hasSkill && maxMin !== null && row.level >= maxMin;
              const isGap       = hasSkill && maxMin !== null && row.level < maxMin;
              return (
                <tr key={s.id} className={`border-b transition-colors ${hasSkill ? "bg-emerald-50/40 hover:bg-emerald-50/70" : "hover:bg-surface-2"}`}>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" checked={hasSkill} className="h-4 w-4 accent-primary cursor-pointer"
                      onChange={e => {
                        if (e.target.checked) updateDraft(s.id, { has: true, level: row.level || (maxMin ?? 2), wi_pass: row.wi_pass });
                        else updateDraft(s.id, { has: false });
                      }} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{s.code}</div>
                  </td>
                  <td className="px-3 py-2">
                    {reqList.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {reqList.slice(0, 3).map(r => {
                          const proc = defaultLineProcs.find(p => p.id === r.process_id);
                          return <span key={r.process_id} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">{proc?.code ?? "—"}</span>;
                        })}
                        {reqList.length > 3 && <span className="text-[10px] text-muted-foreground">+{reqList.length - 3}</span>}
                      </div>
                    ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {hasSkill ? (
                      <div className="flex flex-col items-center gap-1">
                        <select value={row.level}
                          className={`h-7 rounded border text-xs px-1.5 text-center appearance-auto ${
                            isFulfilled ? "border-emerald-400 bg-emerald-50 text-emerald-700" : isGap ? "border-amber-400 bg-amber-50 text-amber-700" : "bg-background"
                          }`}
                          onChange={e => updateDraft(s.id, { level: parseInt(e.target.value) })}>
                          {[0,1,2,3,4].map(l => <option key={l} value={l}>{l} — {SKILL_LEVEL_LABEL[l]}</option>)}
                        </select>
                        {maxMin !== null && (
                          <span className={`text-[9px] font-medium ${isFulfilled ? "text-emerald-600" : "text-amber-600"}`}>
                            {isFulfilled ? "✓ ok" : `min. ${maxMin}`}
                          </span>
                        )}
                      </div>
                    ) : <span className="text-muted-foreground/30 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {hasSkill ? (
                      <input type="checkbox" checked={row.wi_pass} className="h-4 w-4 accent-primary cursor-pointer"
                        onChange={e => updateDraft(s.id, { wi_pass: e.target.checked })} />
                    ) : <span className="text-muted-foreground/30 text-xs">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t mt-1">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={savingSkill}>Tutup</Button>
        <Button type="button" onClick={saveDraft} disabled={!draftDirty || savingSkill} className="gap-1.5">
          {savingSkill ? <><GraduationCap className="h-4 w-4 animate-pulse" /> Menyimpan…</> : <><GraduationCap className="h-4 w-4" /> Simpan Skill</>}
        </Button>
      </div>
    </FormModal>
  );
}

