import { useEffect, useMemo, useState } from "react";
import { Activity, ShieldCheck, Wrench, Moon, Sun, Maximize2, Minimize2, RotateCcw, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  useMonitoringRun,
  useMonitoringHourly,
  useMonitoringCheckSheets,
  useMonitoringRealtime,
} from "@/hooks/useMonitoring";

interface StatusPanelProps {
  density: "compact" | "comfortable";
  onDensityChange: (density: "compact" | "comfortable") => void;
  isDarkMode: boolean;
  onDarkModeToggle: (darkMode: boolean) => void;
  onRefresh: () => void;
}

function PanelCard({ title, icon: Icon, badge, children, density = "comfortable" }: { 
  title: string; 
  icon: typeof Activity; 
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

export function StatusPanel({ density, onDensityChange, isDarkMode, onDarkModeToggle, onRefresh }: StatusPanelProps) {
  const { effectiveRole } = useAuth();
  const [now, setNow] = useState(new Date());

  // Live data
  const { data: activeRun, isLoading: runLoading, refetch: refetchRun } = useMonitoringRun();
  const runId = activeRun?.id;
  const { data: hourlyRaw = [] } = useMonitoringHourly(runId);
  const { data: checkSheets = [] } = useMonitoringCheckSheets(runId);

  // Realtime subscription
  const subStatus = useMonitoringRealtime(runId);

  // Clock tick
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Dark mode toggle
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    return () => { document.documentElement.classList.remove("dark"); };
  }, [isDarkMode]);

  // Derived data
  const totalActual = hourlyRaw.reduce((s, r) => s + r.actual_qty, 0);
  const totalNg = hourlyRaw.reduce((s, r) => s + r.ng_qty, 0);
  const targetQty = activeRun?.target_qty ?? 0;
  const achievement = targetQty > 0 ? (totalActual / targetQty) * 100 : 0;
  const startTime = useMemo(() => activeRun?.started_at ? new Date(activeRun.started_at) : null, [activeRun]);

  // Check sheet data
  const statusChecks = useMemo(() => {
    return checkSheets
      .filter(c => c.check_sheet_templates?.kind === "5F5L")
      .sort((a, b) => (a.check_sheet_templates?.sort_order ?? 0) - (b.check_sheet_templates?.sort_order ?? 0))
      .map(c => ({
        label: c.check_sheet_templates?.label ?? "—",
        time: new Date(c.checked_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false}),
        done: c.passed,
      }));
  }, [checkSheets]);

  const autonomousChecks = useMemo(() => {
    return checkSheets
      .filter(c => c.check_sheet_templates?.kind === "AUTONOMOUS")
      .sort((a, b) => (a.check_sheet_templates?.sort_order ?? 0) - (b.check_sheet_templates?.sort_order ?? 0))
      .map(c => ({
        label: c.check_sheet_templates?.label ?? "—",
        time: new Date(c.checked_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false}),
        done: c.passed,
      }));
  }, [checkSheets]);

  function formatDuration(start: Date, now: Date) {
    const diffMs = Math.max(0, now.getTime() - start.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}j ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}d`;
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Activity className="h-3 w-3" /> Live Monitoring Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Production Monitoring</h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Dashboard status line, OEE & quality, dan skill matrix mengikuti struktur dari mockup HTML yang Anda kirim.
          </p>
        </div>
        <div className="flex items-end gap-3 flex-wrap justify-end">
          {runLoading
            ? <span className="chip"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Memuat…</span>
            : subStatus === "live"
              ? <span className="chip chip-success"><span className="live-dot" /> LIVE ⚡</span>
              : subStatus === "error"
                ? <span className="chip chip-danger">⚠ Koneksi Error</span>
                : <span className="chip chip-warning">Menghubungkan…</span>
          }
          <div className="rounded-2xl border bg-card px-4 py-2 shadow-card">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Clock</div>
            <div className="font-mono text-sm tabular-nums">{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false})}</div>
          </div>
          <div className="rounded-2xl border bg-card px-4 py-2 shadow-card">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Shift</div>
            <div className="text-sm font-semibold">
              {activeRun ? `${activeRun.shifts?.name ?? "—"} · ${activeRun.lines?.code ?? "—"}` : "Tidak ada run aktif"}
            </div>
          </div>
          <div className="flex gap-1 rounded-2xl border bg-card p-1">
            <Button
              size="icon"
              variant={density === "compact" ? "default" : "ghost"}
              onClick={() => onDensityChange("compact")}
              className="h-9 w-9"
              title="Compact view"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={density === "comfortable" ? "default" : "ghost"}
              onClick={() => onDensityChange("comfortable")}
              className="h-9 w-9"
              title="Comfortable view"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={() => onDarkModeToggle(!isDarkMode)}
            className="rounded-2xl h-10 w-10"
            title={isDarkMode ? "Light mode" : "Dark mode"}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => {
              setNow(new Date());
              refetchRun();
              onRefresh();
              toast.success("Dashboard refreshed");
            }}
            className="rounded-2xl h-10 w-10"
            title="Manual refresh"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Production Line Header */}
      <div className="rounded-[24px] bg-[linear-gradient(135deg,#1A6EFA_0%,#0047D4_60%,#003BB5_100%)] px-5 sm:px-6 py-5 text-white shadow-card-lg relative overflow-hidden">
        <div className="absolute -right-6 -top-6 h-36 w-36 rounded-full bg-white/10" />
        <div className="absolute right-52 -bottom-12 h-28 w-28 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-semibold">Production Line</div>
            <div className="text-xl font-bold tracking-tight">
              {activeRun ? `${activeRun.lines?.code} — ${activeRun.lines?.name}` : "Tidak ada shift aktif"}
            </div>
            <div className="mt-1 text-xs font-mono text-white/65">Realtime · {now.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}</div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {statusChecks.length > 0 && (
              <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold">
                5F/5L {statusChecks.filter(c => c.done).length}/{statusChecks.length}
              </span>
            )}
            {autonomousChecks.length > 0 && autonomousChecks.every(c => c.done) && (
              <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold">Autonomous OK</span>
            )}
            <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold">
              Target {targetQty.toLocaleString("id-ID")} pcs
            </span>
          </div>
        </div>
      </div>

      {/* Production Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          {
            label: "Start Produksi",
            value: startTime ? startTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false}) : "—",
            sub: startTime ? `Durasi: ${formatDuration(startTime, now)}` : "Belum ada shift aktif",
            tone: "blue",
          },
          {
            label: "Aktual Output",
            value: `${totalActual.toLocaleString("id-ID")} pcs`,
            sub: `Target: ${targetQty.toLocaleString("id-ID")} pcs`,
            tone: "green",
            progress: achievement,
          },
          {
            label: "Total NG / Reject",
            value: `${totalNg}`,
            sub: `NG Ratio: ${(totalActual + totalNg) > 0 ? ((totalNg / (totalActual + totalNg)) * 100).toFixed(2) : "0.00"}%`,
            tone: "red",
            progress: (totalActual + totalNg) > 0 ? (totalNg / (totalActual + totalNg)) * 100 * 10 : 0,
          },
          {
            label: "Pencapaian Target",
            value: `${achievement.toFixed(1)}%`,
            sub: `Update: ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false})}`,
            tone: "amber",
            progress: achievement,
          },
        ].map((item) => {
          const tones = {
            blue: "border-blue-100 bg-blue-50/70 text-primary",
            green: "border-emerald-100 bg-emerald-50/70 text-emerald-600",
            red: "border-red-100 bg-red-50/70 text-red-600",
            amber: "border-amber-100 bg-amber-50/70 text-amber-600",
          }[item.tone as "blue" | "green" | "red" | "amber"];
          return (
            <Card key={item.label} className={`p-4 sm:p-5 shadow-card-md border ${tones} overflow-hidden`}>
              <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">{item.label}</div>
              <div className="mt-1 text-2xl sm:text-[28px] font-bold tracking-tight font-mono">{item.value}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{item.sub}</div>
              {typeof item.progress === "number" && (
                <div className="mt-3 h-1.5 rounded-full bg-black/5 overflow-hidden">
                  <div className={`h-full rounded-full ${item.tone === "green" ? "bg-gradient-to-r from-[#00B37D] to-[#34D399]" : item.tone === "red" ? "bg-gradient-to-r from-[#EF4444] to-[#FC8181]" : "bg-gradient-to-r from-[#F59E0B] to-[#FCD34D]"}`} style={{ width: `${Math.min(100, item.progress)}%` }} />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Check Sheets */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard
          title="Check Sheet Inspection — 5 First / 5 Last"
          icon={ShieldCheck}
          badge={
            <span className={`chip ${statusChecks.length > 0 && statusChecks.every(c => c.done) ? "chip-success" : "chip-warning"}`}>
              {statusChecks.filter(c => c.done).length} / {statusChecks.length} Selesai
            </span>
          }
          density={density}
        >
          <div className="space-y-3">
            {statusChecks.map((item, index) => (
              <div key={item.label} className="flex items-center gap-3 rounded-xl border bg-surface px-3 py-2.5">
                <div className="h-8 w-8 rounded-full bg-blue-50 text-primary grid place-items-center font-mono text-xs font-bold">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground">{item.time}</div>
                </div>
                <div className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.done ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{item.done ? "✓" : "✗"}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#FCD34D]"
              style={{ width: `${statusChecks.length > 0 ? Math.round((statusChecks.filter(c => c.done).length / statusChecks.length) * 100) : 0}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Progress 5F/5L</span>
            <span className="font-mono font-semibold text-amber-600">
              {statusChecks.length > 0 ? Math.round((statusChecks.filter(c => c.done).length / statusChecks.length) * 100) : 0}%
            </span>
          </div>
        </PanelCard>

        <PanelCard
          title="Check Sheet Autonomous Maintenance"
          icon={Wrench}
          badge={
            <span className={`chip ${autonomousChecks.length > 0 && autonomousChecks.every(c => c.done) ? "chip-success" : "chip-warning"}`}>
              {autonomousChecks.length > 0 && autonomousChecks.every(c => c.done) ? "COMPLETE" : `${autonomousChecks.filter(c => c.done).length}/${autonomousChecks.length}`}
            </span>
          }
          density={density}
        >
          <div className="space-y-3">
            {autonomousChecks.map((item, index) => (
              <div key={item.label} className="flex items-center gap-3 rounded-xl border bg-surface px-3 py-2.5">
                <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-700 grid place-items-center font-mono text-xs font-bold">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground">{item.time}</div>
                </div>
                <div className="rounded-full px-2.5 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-700">✓</div>
              </div>
            ))}
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00B37D] to-[#34D399]"
              style={{ width: `${autonomousChecks.length > 0 ? Math.round((autonomousChecks.filter(c => c.done).length / autonomousChecks.length) * 100) : 0}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Progress Autonomous Check</span>
            <span className="font-mono font-semibold text-emerald-600">
              {autonomousChecks.length > 0 ? Math.round((autonomousChecks.filter(c => c.done).length / autonomousChecks.length) * 100) : 0}%
            </span>
          </div>
        </PanelCard>
      </div>

      <div className="text-[11px] text-muted-foreground">
        Role aktif: <strong className="text-foreground">{effectiveRole}</strong>
      </div>
    </div>
  );
}
