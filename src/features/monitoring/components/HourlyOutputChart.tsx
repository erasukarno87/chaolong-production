import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useMonitoringRun, useMonitoringHourly } from "@/hooks/useMonitoring";

interface HourlyOutputChartProps {
  density: "compact" | "comfortable";
}

function PanelCard({ title, icon: Icon, badge, children, density = "comfortable" }: { 
  title: string; 
  icon: typeof BarChart3; 
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

export function HourlyOutputChart({ density }: HourlyOutputChartProps) {
  const { data: activeRun } = useMonitoringRun();
  const runId = activeRun?.id;
  const { data: hourlyRaw = [] } = useMonitoringHourly(runId);
  const hourlyTarget = activeRun?.hourly_target ?? 150;

  return (
    <PanelCard
      title="Output Per Jam — Aktual vs Target"
      icon={BarChart3}
      badge={
        <span className="chip chip-info">
          {activeRun?.shifts?.name ?? "Shift"} · {activeRun?.shifts?.start_time ?? "—"} – {activeRun?.shifts?.end_time ?? "—"}
        </span>
      }
      density={density}
    >
      {hourlyRaw.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Belum ada data output jam ini.</div>
      ) : (
        <>
          <div className="flex items-end gap-2 sm:gap-3 h-48 overflow-x-auto pb-2">
            {hourlyRaw.map((r) => {
              const fill = Math.max(8, Math.min(100, hourlyTarget > 0 ? (r.actual_qty / hourlyTarget) * 100 : 0));
              return (
                <div key={r.id} className="min-w-[64px] flex-1 flex flex-col items-center gap-2">
                  <div className="w-full h-32 flex items-end rounded-xl bg-slate-100/80 border border-dashed border-slate-300 overflow-hidden">
                    <div
                      className={`w-full rounded-t-xl bg-gradient-to-t ${r.actual_qty >= hourlyTarget ? "from-[#00B37D] to-[#34D399]" : "from-[#1A6EFA] to-[#60A5FA]"}`}
                      style={{ height: `${fill}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-mono font-semibold">{r.hour_label}</div>
                  <div className="text-[10px] font-mono font-bold">{r.actual_qty}</div>
                  {r.note && <div className="text-[9px] text-muted-foreground text-center leading-tight">{r.note}</div>}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Aktual</div>
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> On-target / exceed</div>
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm border border-dashed border-slate-400 bg-slate-100" /> Target ({hourlyTarget} pcs/jam)</div>
          </div>
        </>
      )}
    </PanelCard>
  );
}
