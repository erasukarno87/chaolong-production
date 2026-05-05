import { useMemo } from "react";
import { Gauge, TriangleAlert, Clock3, Users, Layers3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  useMonitoringRun,
  useMonitoringHourly,
  useMonitoringNg,
  useMonitoringDowntime,
  useMonitoringDowntimeRaw,
} from "@/hooks/useMonitoring";

type RatioItem = {
  label: string;
  value: string;
  pct: number;
  tone: "blue" | "green" | "amber" | "red" | "purple";
};

interface OEESPanelProps {
  density: "compact" | "comfortable";
}

function PanelCard({ title, icon: Icon, badge, children, density = "comfortable" }: { 
  title: string; 
  icon: typeof Gauge; 
  badge?: React.ReactNode; 
  children: React.ReactNode; 
  density?: "compact" | "comfortable" 
}) {
  return (
    <Card className={`shadow-card-md hover:shadow-card-lg transition-shadow ${density === "compact" ? "p-3 sm:p-4" : "p-5 sm:p-6"}`}>
      <div className={`flex items-center justify-between gap-3 ${density === "compact" ? "mb-2" : "mb-4"}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`rounded-lg bg-blue-50 text-primary grid place-items-center shrink-0 ${density === "compact" ? "h-6 w-6" : "h-7 w-7"}`}>
            <Icon className={`${density === "compact" ? "h-3 w-3" : "h-3.5 w-3.5"}`} />
          </div>
          <h2 className={`font-semibold tracking-tight truncate ${density === "compact" ? "text-xs" : "text-sm"}`}>{title}</h2>
        </div>
        {badge}
      </div>
      {children}
    </Card>
  );
}

function toneClasses(tone: RatioItem["tone"]) {
  switch (tone) {
    case "blue": return { pill: "bg-blue-100 text-blue-700", fill: "bg-gradient-to-r from-[#1A6EFA] to-[#60A5FA]", value: "text-[#1A6EFA]" };
    case "green": return { pill: "bg-emerald-100 text-emerald-700", fill: "bg-gradient-to-r from-[#00B37D] to-[#34D399]", value: "text-[#00B37D]" };
    case "amber": return { pill: "bg-amber-100 text-amber-700", fill: "bg-gradient-to-r from-[#F59E0B] to-[#FCD34D]", value: "text-[#F59E0B]" };
    case "red": return { pill: "bg-red-100 text-red-700", fill: "bg-gradient-to-r from-[#EF4444] to-[#FC8181]", value: "text-[#EF4444]" };
    case "purple": return { pill: "bg-violet-100 text-violet-700", fill: "bg-gradient-to-r from-[#8B5CF6] to-[#C4B5FD]", value: "text-[#8B5CF6]" };
    default: return { pill: "bg-slate-100 text-slate-700", fill: "bg-slate-400", value: "text-slate-700" };
  }
}

export function OEESPanel({ density }: OEESPanelProps) {
  const { data: activeRun } = useMonitoringRun();
  const runId = activeRun?.id;
  const { data: hourlyRaw = [] } = useMonitoringHourly(runId);
  const { data: ngAgg = [] } = useMonitoringNg(runId);
  const { data: dtAgg = [] } = useMonitoringDowntime(runId);
  const { data: dtRaw = [] } = useMonitoringDowntimeRaw(runId);

  // OEE Calculations
  const totalActual = hourlyRaw.reduce((s, r) => s + r.actual_qty, 0);
  const totalNg = hourlyRaw.reduce((s, r) => s + r.ng_qty, 0);
  const hourlyTarget = activeRun?.hourly_target ?? 150;
  const totalDt = dtAgg.reduce((s, d) => s + d.total_min, 0);
  const plannedMins = 480;
  const otr = plannedMins > 0 ? Math.max(0, Math.min(100, ((plannedMins - totalDt) / plannedMins) * 100)) : 100;
  const per = hourlyTarget > 0 ? Math.min(100, (totalActual / ((hourlyRaw.length || 1) * hourlyTarget)) * 100) : 100;
  const qr = (totalActual + totalNg) > 0 ? (totalActual / (totalActual + totalNg)) * 100 : 100;
  const oee = (otr * per * qr) / 10000;

  const oeeCircle = 2 * Math.PI * 40;
  const oeeOffset = oeeCircle * (1 - Math.min(100, oee) / 100);

  // 4M Condition Status
  const m4Items = useMemo(() => {
    // Machine breakdown events
    const machineEvts = dtRaw.filter(e => {
      const code = e.downtime_categories?.code ?? "";
      return code === "BREAKDOWN" || (e.kind === "unplanned" && code !== "WAITMAT" && code !== "UTIL" && code !== "QHOLD");
    });
    const machineMins = machineEvts.reduce((s, e) => s + e.duration_minutes, 0);

    // Material waiting events
    const matEvts = dtRaw.filter(e => {
      const code = e.downtime_categories?.code ?? "";
      return code === "WAITMAT" || code === "UTIL";
    });
    const matMins = matEvts.reduce((s, e) => s + e.duration_minutes, 0);

    return [
      {
        icon: "⚙️", label: "Machine",
        badge: machineEvts.length === 0 ? "OK" : "Attention",
        tone: machineEvts.length === 0 ? "green" : "amber",
        title: machineEvts.length > 0
          ? `${machineEvts.length} event breakdown. Total downtime unplanned: ${machineMins} mnt.`
          : "Tidak ada breakdown tercatat pada shift ini.",
      },
      {
        icon: "📦", label: "Material",
        badge: matEvts.length === 0 ? "OK" : "Attention",
        tone: matEvts.length === 0 ? "green" : "amber",
        title: matEvts.length > 0
          ? `${matEvts.length} event tunggu material/utility. Total: ${matMins} mnt.`
          : "Tidak ada event tunggu material pada shift ini.",
      },
    ] as { icon: string; label: string; badge: string; tone: "green" | "amber"; title: string }[];
  }, [dtRaw]);

  // SCW Events
  const scwEvents = useMemo(() => {
    return dtRaw.map(e => {
      const code = e.downtime_categories?.code ?? "";
      const marker: "STOP" | "CALL" | "WAIT" =
        code === "BREAKDOWN" ? "STOP" :
        code === "QHOLD"     ? "CALL" : "WAIT";

      const startStr = new Date(e.started_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false});
      const endStr   = e.ended_at
        ? new Date(e.ended_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false})
        : null;
      const timeStr  = endStr
        ? `${startStr} – ${endStr} (${e.duration_minutes} mnt)`
        : `${startStr} (${e.kind === "unplanned" ? "On-going" : "Pending"})`;

      const badge: "Resolved" | "On-going" | "Pending" = e.ended_at
        ? "Resolved"
        : e.kind === "unplanned" ? "On-going" : "Pending";

      const catName  = e.downtime_categories?.name ?? e.kind;
      const label    = e.root_cause ? `${catName} — ${e.root_cause}` : catName;
      const meta     = e.action_taken ?? "";

      return { id: e.id, marker, label, time: timeStr, badge, meta };
    });
  }, [dtRaw]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Overall Equipment Effectiveness" icon={Gauge} badge={<span className="chip chip-warning">Below Target (85%)</span>} density={density}>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative h-44 w-44 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-200" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="url(#oeeGrad)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={oeeCircle}
                  strokeDashoffset={oeeOffset}
                  transform="rotate(-90 50 50)"
                />
                <defs>
                  <linearGradient id="oeeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00B37D" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="font-mono text-4xl font-bold leading-none text-emerald-600">{oee.toFixed(1)}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">OEE %</div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3 w-full">
              {[
                { label: "OTR", width: otr, color: "blue",   value: `${otr.toFixed(1)}%`,  title: "Availability" },
                { label: "PER", width: per, color: "green",  value: `${per.toFixed(1)}%`,  title: "Performance" },
                { label: "QR",  width: qr,  color: "purple", value: `${qr.toFixed(1)}%`,   title: "Quality" },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 text-xs font-semibold text-muted-foreground">{row.label}</div>
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${row.color === "blue" ? "bg-gradient-to-r from-[#1A6EFA] to-[#60A5FA]" : row.color === "green" ? "bg-gradient-to-r from-[#00B37D] to-[#34D399]" : "bg-gradient-to-r from-[#8B5CF6] to-[#C4B5FD]"}`}
                        style={{ width: `${Math.min(100, row.width)}%` }}
                      />
                    </div>
                    <div className={`w-14 text-right text-xs font-bold ${row.color === "blue" ? "text-[#1A6EFA]" : row.color === "green" ? "text-[#00B37D]" : "text-[#8B5CF6]"}`}>{row.value}</div>
                  </div>
                  <div className="ml-12 mt-0.5 text-[10px] text-muted-foreground">{row.title}</div>
                </div>
              ))}
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[11px] text-muted-foreground">
                Formula: {(otr / 100).toFixed(2)} × {(per / 100).toFixed(2)} × {(qr / 100).toFixed(2)} = <span className="font-mono font-bold text-foreground">{oee.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </PanelCard>

        <PanelCard
          title="NG Ratio per Defect"
          icon={TriangleAlert}
          badge={
            <span className="chip chip-danger">
              Total: {(totalActual + totalNg) > 0 ? ((totalNg / (totalActual + totalNg)) * 100).toFixed(2) : "0.00"}%
            </span>
          }
          density={density}
        >
          {ngAgg.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Tidak ada data NG untuk shift ini.</div>
          ) : (
            <div className="space-y-3">
              {ngAgg.map((item) => {
                const tone: RatioItem["tone"] = item.pct > 50 ? "red" : item.pct > 25 ? "amber" : "green";
                const tones = toneClasses(tone);
                return (
                  <div key={item.defect_name} className="grid grid-cols-[120px_1fr_64px] sm:grid-cols-[150px_1fr_64px] items-center gap-3">
                    <div className="text-xs text-muted-foreground truncate" title={item.defect_name}>{item.defect_name}</div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${tones.fill}`} style={{ width: `${item.pct}%` }} />
                    </div>
                    <div className={`text-right text-xs font-bold ${tones.value}`}>{item.total_qty} pcs</div>
                  </div>
                );
              })}
            </div>
          )}
        </PanelCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard
          title="Downtime Analysis"
          icon={Clock3}
          badge={
            <span className={`chip ${totalDt > 0 ? "chip-danger" : "chip-success"}`}>
              Total: {totalDt} menit
            </span>
          }
          density={density}
        >
          {dtAgg.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Tidak ada downtime tercatat untuk shift ini.</div>
          ) : (
            <div className="space-y-3">
              {dtAgg.map((item) => {
                const tone: RatioItem["tone"] = item.pct > 50 ? "red" : item.pct > 25 ? "amber" : "green";
                const tones = toneClasses(tone);
                return (
                  <div key={item.category_name} className="grid grid-cols-[120px_1fr_54px] sm:grid-cols-[150px_1fr_54px] items-center gap-3">
                    <div className="text-xs text-muted-foreground truncate" title={item.category_name}>{item.category_name}</div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${tones.fill}`} style={{ width: `${item.pct}%` }} />
                    </div>
                    <div className={`text-right text-xs font-bold ${tones.value}`}>{item.total_min} mn</div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-xs text-muted-foreground">
            <span>Downtime loss terhadap planned time</span>
            <span className={`font-mono font-bold ${totalDt > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {plannedMins > 0 ? ((totalDt / plannedMins) * 100).toFixed(1) : "0.0"}%
            </span>
          </div>
        </PanelCard>

        <PanelCard title="4M Condition Status" icon={Users} badge={null} density={density}>
          <div className="grid gap-3 sm:grid-cols-2">
            {m4Items.map((item) => (
              <div key={item.label} className="rounded-2xl border bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-9 w-9 rounded-xl grid place-items-center text-base ${item.tone === "green" ? "bg-emerald-100" : "bg-amber-100"}`}>{item.icon}</div>
                    <div>
                      <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground">{item.label}</div>
                      <div className="text-sm font-semibold">{item.badge}</div>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.title}</p>
              </div>
            ))}
          </div>
        </PanelCard>
      </div>

      <PanelCard
        title="SCW Log — Stop · Call · Wait"
        icon={Layers3}
        badge={<span className="chip chip-info">{scwEvents.length} Event{scwEvents.length !== 1 ? "s" : ""}</span>}
        density={density}
      >
        {scwEvents.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {activeRun ? "Tidak ada SCW event pada shift ini." : "Tidak ada shift run aktif."}
          </div>
        ) : (
          <div className="space-y-4">
            {scwEvents.map((item) => (
              <div key={item.id} className="flex gap-4 rounded-2xl border bg-surface p-4">
                <div className={`h-12 w-12 rounded-2xl grid place-items-center text-xs font-black shrink-0 ${item.marker === "STOP" ? "bg-red-100 text-red-700" : item.marker === "CALL" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                  {item.marker}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold leading-relaxed">{item.label}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-mono font-semibold">{item.time}</span>
                    <span className={`chip ${item.badge === "Resolved" ? "chip-success" : item.badge === "On-going" ? "chip-warning" : "chip-info"}`}>{item.badge}</span>
                    {item.meta && <span>{item.meta}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PanelCard>
    </div>
  );
}
