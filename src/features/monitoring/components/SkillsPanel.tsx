import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useMonitoringRun, useMonitoringSkills } from "@/hooks/useMonitoring";

interface SkillsPanelProps {
  density: "compact" | "comfortable";
}

function getSkillTone(level: number) {
  if (level === 0) return "bg-slate-100 text-slate-500 border-slate-300";
  if (level === 1) return "bg-amber-100 text-amber-900 border-amber-400";
  if (level === 2) return "bg-blue-100 text-blue-700 border-blue-500";
  if (level === 3) return "bg-emerald-100 text-emerald-800 border-emerald-500";
  return "bg-violet-100 text-violet-800 border-violet-500";
}

function skillLabel(level: number) {
  return ["0", "1", "2", "3", "4"][level] ?? "0";
}

export function SkillsPanel({ density }: SkillsPanelProps) {
  void density;
  const { data: activeRun } = useMonitoringRun();
  const { data: skillRows = [] } = useMonitoringSkills();

  // Filter operators by active line
  const lineSkillRows = useMemo(() => {
    if (!activeRun?.line_id) return skillRows;
    return skillRows.filter(r => r.assigned_line_ids.includes(activeRun.line_id));
  }, [skillRows, activeRun]);

  // Skill column headers = unique process names from operators on this line
  const skillHeaders = useMemo(() => {
    const names = new Set<string>();
    for (const row of lineSkillRows) for (const s of row.skills) names.add(s.process_name);
    return Array.from(names);
  }, [lineSkillRows]);

  // Skill metrics
  const skillMetrics = useMemo(() => {
    const allSkillLevels = lineSkillRows.flatMap(r => r.skills.map(s => s.level));
    const avgSkill = allSkillLevels.length > 0 ? (allSkillLevels.reduce((a, b) => a + b, 0) / allSkillLevels.length) : 0;
    const wiPassCount = lineSkillRows.filter(r => r.skills.length > 0 && r.skills.every(s => s.wi_pass)).length;
    const wiPassPct = lineSkillRows.length > 0 ? Math.round((wiPassCount / lineSkillRows.length) * 100) : 0;
    const gapCount = lineSkillRows.filter(r => r.skills.some(s => s.level < 2)).length;
    const lineName = activeRun?.lines?.code ?? "Semua";
    return [
      { label: "Operator di Line", value: `${lineSkillRows.length}`, sub: `Line: ${lineName}`, tone: "green" },
      { label: "Rata-rata Skill", value: avgSkill.toFixed(1), sub: "Dari skala 0–4", tone: "blue" },
      { label: "Pass W/I", value: `${wiPassCount} / ${lineSkillRows.length}`, sub: `Compliance W/I ${wiPassPct}%`, tone: "green", progress: wiPassPct },
      { label: "Skill Gap Alert", value: `${gapCount}`, sub: "Operator dgn level < 2", tone: gapCount > 0 ? "red" : "green" as const },
      { label: "Workstation", value: `${skillHeaders.length}`, sub: `Stasiun aktif di ${lineName}`, tone: "amber" },
    ];
  }, [lineSkillRows, activeRun, skillHeaders]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        {skillMetrics.map((item) => (
          <Card key={item.label} className={`p-4 sm:p-5 shadow-card-md border ${
            item.tone === "green" ? "bg-emerald-50/70 border-emerald-100" : 
            item.tone === "blue" ? "bg-blue-50/70 border-blue-100" : 
            item.tone === "red" ? "bg-red-50/70 border-red-100" : 
            "bg-amber-50/70 border-amber-100"
          }`}>
            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">{item.label}</div>
            <div className={`mt-1 text-2xl font-bold ${
              item.tone === "green" ? "text-emerald-600" : 
              item.tone === "blue" ? "text-primary" : 
              item.tone === "red" ? "text-red-600" : 
              "text-amber-600"
            }`}>{item.value}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{item.sub}</div>
            {typeof item.progress === "number" && (
              <div className="mt-3 h-1.5 rounded-full bg-black/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#00B37D] to-[#34D399]" style={{ width: `${item.progress}%` }} />
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-4 sm:p-5 shadow-card-md">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-semibold uppercase tracking-[0.12em]">
          <span>Skill Level:</span>
          {[
            { n: 0, label: "Belum Mampu" },
            { n: 1, label: "Belajar (Pengawasan ketat)" },
            { n: 2, label: "Mampu (Mandiri)" },
            { n: 3, label: "Terampil (Analitikal)" },
            { n: 4, label: "Expert (Bisa Melatih)" },
          ].map((item) => (
            <span key={item.n} className="inline-flex items-center gap-1 rounded-full border bg-surface px-2.5 py-1 text-[10px] normal-case tracking-normal">
              <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold ${getSkillTone(item.n)}`}>{skillLabel(item.n)}</span>
              {item.label}
            </span>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden shadow-card-md">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full border-separate border-spacing-0">
            <thead className="bg-slate-50">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Operator</th>
                {skillHeaders.map((header) => (
                  <th key={header} className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{header}</th>
                ))}
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">W/I</th>
              </tr>
            </thead>
            <tbody>
              {skillRows.length === 0 ? (
                <tr>
                  <td colSpan={skillHeaders.length + 2} className="py-8 text-center text-sm text-muted-foreground">
                    Belum ada data skill operator.
                  </td>
                </tr>
              ) : lineSkillRows.map((row, rowIndex) => {
                const wiAll = row.skills.length > 0 && row.skills.every(s => s.wi_pass);
                const wiAny = row.skills.some(s => s.wi_pass);
                const wiStatus: "PASS" | "CHECK" | "FAIL" = wiAll ? "PASS" : wiAny ? "CHECK" : "FAIL";
                return (
                  <tr key={row.operator_id} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                    <td className="sticky left-0 z-10 border-t px-4 py-3 bg-inherit">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 grid place-items-center text-xs font-bold">
                          {row.initials ?? row.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{row.full_name}</div>
                          <div className="text-[11px] text-muted-foreground">Join {row.join_date}</div>
                        </div>
                      </div>
                    </td>
                    {skillHeaders.map((header) => {
                      const skill = row.skills.find(s => s.process_name === header);
                      const level = skill?.level ?? 0;
                      return (
                        <td key={`${row.operator_id}-${header}`} className="border-t px-3 py-3 text-center">
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border text-xs font-bold ${getSkillTone(level)}`}>
                            {skillLabel(level)}
                          </span>
                        </td>
                      );
                    })}
                    <td className="border-t px-4 py-3 text-center">
                      <span className={`chip ${wiStatus === "PASS" ? "chip-success" : wiStatus === "CHECK" ? "chip-warning" : "chip-danger"}`}>
                        {wiStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
