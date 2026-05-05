import { useState, useMemo } from "react";
import {
  TrendingDown, BarChart3, Clock3, ClipboardList, ShieldAlert,
} from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { useTraceHourly, useTraceNg, useTraceDowntime } from "./hooks";
import { fmtTime, StatCard } from "./helpers.tsx";
import type { TraceRun, TraceDowntime, DetailTab } from "./types";
import { FOURM_META, DISPOSITION_CHIP } from "./types";

interface Props { run: TraceRun; }

export function DetailPanel({ run }: Props) {
  const [tab, setTab] = useState<DetailTab>("summary");

  const { data: hourly = [] } = useTraceHourly(run.id);
  const { data: ngList = [] } = useTraceNg(run.id);
  const { data: dtList = [] } = useTraceDowntime(run.id);

  const totalActual = hourly.filter(h => !h.is_break).reduce((s, h) => s + h.actual_qty, 0);
  const totalNg     = ngList.reduce((s, n) => s + n.qty, 0);
  const totalDt     = dtList.reduce((s, d) => s + d.duration_minutes, 0);
  const achievement = run.target_qty > 0 ? ((totalActual / run.target_qty) * 100).toFixed(1) : "—";
  const ngRate      = totalActual > 0 ? ((totalNg / (totalActual + totalNg)) * 100).toFixed(2) : "0.00";

  const ngByDefect = useMemo(() => {
    const map = new Map<string, { code: string; name: string; category: string; pos: string; qty: number; dispositions: string[] }>();
    for (const n of ngList) {
      const key = n.defect_types?.code ?? "—";
      const ex  = map.get(key);
      if (ex) {
        ex.qty += n.qty;
        if (!ex.dispositions.includes(n.disposition)) ex.dispositions.push(n.disposition);
      } else {
        map.set(key, {
          code: n.defect_types?.code ?? "—", name: n.defect_types?.name ?? "Unknown",
          category: n.defect_types?.category ?? "—",
          pos: n.processes ? `${n.processes.code} ${n.processes.name}` : "—",
          qty: n.qty, dispositions: [n.disposition],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [ngList]);

  const fourMBreakdown = useMemo(() => {
    const groups: Record<string, { minutes: number; events: TraceDowntime[] }> = {};
    for (const d of dtList) {
      const cat = d.downtime_categories?.category ?? "Method";
      if (!groups[cat]) groups[cat] = { minutes: 0, events: [] };
      groups[cat].minutes += d.duration_minutes;
      groups[cat].events.push(d);
    }
    return Object.entries(groups).sort((a, b) => b[1].minutes - a[1].minutes);
  }, [dtList]);

  const tabs: { id: DetailTab; label: string }[] = [
    { id: "summary",  label: "Ringkasan" },
    { id: "hourly",   label: `Output Per Jam (${hourly.length})` },
    { id: "ng",       label: `Detail NG (${totalNg} pcs)` },
    { id: "downtime", label: `Downtime Log (${dtList.length})` },
    { id: "fourm",    label: "Log 4M" },
  ];

  return (
    <div className="mt-3 border-t pt-4">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 mb-4">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
              tab === t.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Ringkasan ── */}
      {tab === "summary" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Output"   value={totalActual.toLocaleString()} sub={`Target: ${run.target_qty.toLocaleString()} pcs`} />
            <StatCard label="Achievement"    value={achievement === "—" ? "—" : `${achievement}%`}
              color={achievement === "—" ? undefined : Number(achievement) >= 90 ? "text-green-600" : Number(achievement) >= 75 ? "text-amber-600" : "text-red-600"} />
            <StatCard label="Total NG"       value={totalNg} sub={`NG Rate: ${ngRate}%`} color={totalNg > 0 ? "text-red-600" : "text-green-600"} />
            <StatCard label="Total Downtime" value={`${totalDt} mn`} sub={dtList.length + " kejadian"} color={totalDt > 30 ? "text-red-600" : "text-foreground"} />
          </div>

          {ngByDefect.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top NG</p>
              <div className="flex flex-wrap gap-2">
                {ngByDefect.slice(0, 6).map(d => (
                  <div key={d.code} className="rounded-xl border px-3 py-2 bg-red-50 border-red-100">
                    <p className="text-xs font-mono text-red-700 font-semibold">{d.code}</p>
                    <p className="text-xs text-muted-foreground">{d.name}</p>
                    <p className="text-sm font-bold text-red-600">{d.qty} pcs</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fourMBreakdown.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Downtime 4M</p>
              <div className="flex flex-wrap gap-2">
                {fourMBreakdown.map(([cat, val]) => {
                  const meta = FOURM_META[cat] ?? FOURM_META["Method"];
                  const Icon = meta.icon;
                  return (
                    <div key={cat} className={`rounded-xl border px-3 py-2 ${meta.bg}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                        <p className={`text-xs font-semibold ${meta.color}`}>{cat}</p>
                      </div>
                      <p className="text-sm font-bold">{val.minutes} mn</p>
                      <p className="text-[11px] text-muted-foreground">{val.events.length} kejadian</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {totalActual === 0 && ngList.length === 0 && dtList.length === 0 && (
            <EmptyState compact icon={<ClipboardList className="h-8 w-8" />} title="Belum ada data" description="Belum ada data yang diinput untuk shift run ini." />
          )}
        </div>
      )}

      {/* ── Output Per Jam ── */}
      {tab === "hourly" && (
        <div className="overflow-x-auto">
          {hourly.length === 0 ? (
            <EmptyState compact icon={<Clock3 className="h-8 w-8" />} title="Belum ada data output" description="Belum ada data output per jam yang dicatat." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-surface-1">
                  {["Periode", "Aktual", "NG", "DT (mn)", "Catatan"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hourly.map(h => (
                  <tr key={h.hour_index} className={`border-b ${h.is_break ? "bg-slate-50 text-muted-foreground" : "hover:bg-surface-2"}`}>
                    <td className="px-3 py-2 font-mono text-xs">{h.hour_label}</td>
                    <td className="px-3 py-2 font-semibold">{h.is_break ? <span className="chip">Break</span> : h.actual_qty}</td>
                    <td className="px-3 py-2">
                      {!h.is_break && h.ng_qty > 0 && <span className="chip chip-danger">{h.ng_qty}</span>}
                      {!h.is_break && h.ng_qty === 0 && <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {h.downtime_minutes > 0 ? <span className="chip chip-warning">{h.downtime_minutes} mn</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">{h.note ?? "—"}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold border-t-2">
                  <td className="px-3 py-2 text-xs">TOTAL</td>
                  <td className="px-3 py-2">{totalActual}</td>
                  <td className="px-3 py-2 text-red-600">{hourly.reduce((s, h) => s + h.ng_qty, 0) || "—"}</td>
                  <td className="px-3 py-2 text-amber-600">{hourly.reduce((s, h) => s + h.downtime_minutes, 0)} mn</td>
                  <td className="px-3 py-2" />
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Detail NG ── */}
      {tab === "ng" && (
        <div className="overflow-x-auto">
          {ngList.length === 0 ? (
            <EmptyState compact icon={<ShieldAlert className="h-8 w-8" />} title="Tidak ada NG" description="Tidak ada entri NG yang dicatat untuk shift run ini." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-surface-1">
                  {["Waktu", "Kode NG", "Nama Defect", "Kategori", "POS / Lokasi", "Qty", "Disposisi", "Keterangan"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ngList.map(n => (
                  <tr key={n.id} className="border-b hover:bg-surface-2">
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">{fmtTime(n.found_at)}</td>
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{n.defect_types?.code ?? "—"}</td>
                    <td className="px-3 py-2 font-medium max-w-[160px]">{n.defect_types?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{n.defect_types?.category ?? "—"}</td>
                    <td className="px-3 py-2">
                      {n.processes ? <span className="chip chip-info font-mono text-[10px]">{n.processes.code}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 font-bold text-red-600">{n.qty}</td>
                    <td className="px-3 py-2"><span className={DISPOSITION_CHIP[n.disposition] ?? "chip"}>{n.disposition}</span></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">{n.description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Downtime Log ── */}
      {tab === "downtime" && (
        <div className="overflow-x-auto">
          {dtList.length === 0 ? (
            <EmptyState compact icon={<TrendingDown className="h-8 w-8" />} title="Tidak ada downtime" description="Tidak ada kejadian downtime yang dicatat untuk shift run ini." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-surface-1">
                  {["Mulai", "Selesai", "Kode", "Nama Kejadian", "Tipe", "Durasi", "Root Cause", "Tindakan"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dtList.map(d => (
                  <tr key={d.id} className="border-b hover:bg-surface-2">
                    <td className="px-3 py-2 font-mono text-xs">{fmtTime(d.started_at)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{d.ended_at ? fmtTime(d.ended_at) : "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{d.downtime_categories?.code ?? "—"}</td>
                    <td className="px-3 py-2 font-medium max-w-[160px]">{d.downtime_categories?.name ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={d.kind === "unplanned" ? "chip chip-danger" : "chip chip-warning"}>
                        {d.kind === "unplanned" ? "🚨 Unplanned" : "📅 Planned"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-bold">{d.duration_minutes} mn</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[180px]">{d.root_cause ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[180px]">{d.action_taken ?? "—"}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold border-t-2">
                  <td colSpan={5} className="px-3 py-2 text-xs">TOTAL DOWNTIME</td>
                  <td className="px-3 py-2 text-amber-600">{totalDt} mn</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Log 4M ── */}
      {tab === "fourm" && (
        <div className="space-y-4">
          {dtList.length === 0 ? (
            <EmptyState compact icon={<BarChart3 className="h-8 w-8" />} title="Tidak ada data 4M" description="Belum ada downtime yang dicatat sehingga analisis 4M tidak tersedia." />
          ) : (
            <>
              <div className="space-y-2">
                {fourMBreakdown.map(([cat, val]) => {
                  const meta = FOURM_META[cat] ?? FOURM_META["Method"];
                  const Icon = meta.icon;
                  const pct  = totalDt > 0 ? (val.minutes / totalDt) * 100 : 0;
                  const barColor =
                    cat === "Man" ? "bg-blue-400" : cat === "Machine" ? "bg-red-400" :
                    cat === "Method" ? "bg-amber-400" : cat === "Material" ? "bg-violet-400" : "bg-green-400";
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className={`flex items-center gap-1.5 w-28 shrink-0 rounded-lg px-2 py-1 ${meta.bg}`}>
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.color}`} />
                        <span className={`text-xs font-semibold ${meta.color}`}>{cat}</span>
                      </div>
                      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%` }}>
                          <div className={`h-full rounded-full ${barColor}`} />
                        </div>
                      </div>
                      <span className="text-xs font-mono font-semibold w-16 text-right">{val.minutes} mn</span>
                      <span className="text-xs text-muted-foreground w-12 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-3 pt-2 border-t">
                {fourMBreakdown.map(([cat, val]) => {
                  const meta = FOURM_META[cat] ?? FOURM_META["Method"];
                  const Icon = meta.icon;
                  return (
                    <div key={cat}>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${meta.bg} mb-2`}>
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                        <span className={`text-sm font-bold ${meta.color}`}>{cat}</span>
                        <span className={`text-xs ${meta.color} ml-auto`}>Total: {val.minutes} mn · {val.events.length} kejadian</span>
                      </div>
                      <div className="pl-3 space-y-1">
                        {val.events.map(e => (
                          <div key={e.id} className="flex items-start gap-3 text-xs border-l-2 border-slate-200 pl-3 py-1">
                            <span className="font-mono text-muted-foreground whitespace-nowrap">{fmtTime(e.started_at)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold">
                                <span className="font-mono text-[10px] bg-slate-100 rounded px-1 mr-1">{e.downtime_categories?.code ?? "—"}</span>
                                {e.downtime_categories?.name ?? "—"}
                              </p>
                              {e.root_cause && <p className="text-muted-foreground truncate">{e.root_cause}</p>}
                            </div>
                            <span className={`font-bold shrink-0 ${e.kind === "unplanned" ? "text-red-600" : "text-amber-600"}`}>{e.duration_minutes} mn</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
