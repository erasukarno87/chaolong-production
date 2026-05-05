import { useMemo } from "react";
import {
  useMonitoringRun,
  useMonitoringHourly,
  useMonitoringNg,
  useMonitoringDowntime,
  useMonitoringDowntimeRaw,
  useMonitoringCheckSheets,
  useMonitoringSkills,
} from "@/hooks/useMonitoring";

export interface CheckItem {
  label: string;
  time: string;
  done: boolean;
}

export interface SCWEvent {
  id: string;
  marker: "STOP" | "CALL" | "WAIT";
  label: string;
  time: string;
  badge: "Resolved" | "On-going" | "Pending";
  meta: string;
}

export interface M4Item {
  icon: string;
  label: string;
  badge: string;
  tone: "green" | "amber";
  title: string;
}

export interface OEEMetrics {
  oee: number;
  otr: number;
  per: number;
  qr: number;
  totalActual: number;
  totalNg: number;
  totalDt: number;
  achievement: number;
}

export interface ProductionMetrics {
  totalActual: number;
  totalNg: number;
  targetQty: number;
  hourlyTarget: number;
  achievement: number;
  startTime: Date | null;
}

export function useMonitoringDataTransform(runId: string | undefined) {
  const { data: activeRun } = useMonitoringRun();
  const { data: hourlyRaw = [] } = useMonitoringHourly(runId);
  const { data: ngAgg = [] } = useMonitoringNg(runId);
  const { data: dtAgg = [] } = useMonitoringDowntime(runId);
  const { data: dtRaw = [] } = useMonitoringDowntimeRaw(runId);
  const { data: checkSheets = [] } = useMonitoringCheckSheets(runId);
  const { data: skillRows = [] } = useMonitoringSkills();

  // Production metrics
  const productionMetrics = useMemo((): ProductionMetrics => {
    const totalActual = hourlyRaw.reduce((s, r) => s + r.actual_qty, 0);
    const totalNg = hourlyRaw.reduce((s, r) => s + r.ng_qty, 0);
    const targetQty = activeRun?.target_qty ?? 0;
    const hourlyTarget = activeRun?.hourly_target ?? 150;
    const achievement = targetQty > 0 ? (totalActual / targetQty) * 100 : 0;
    const startTime = activeRun?.started_at ? new Date(activeRun.started_at) : null;

    return {
      totalActual,
      totalNg,
      targetQty,
      hourlyTarget,
      achievement,
      startTime,
    };
  }, [activeRun, hourlyRaw]);

  // OEE calculations
  const oeeMetrics = useMemo((): OEEMetrics => {
    const totalActual = hourlyRaw.reduce((s, r) => s + r.actual_qty, 0);
    const totalNg = hourlyRaw.reduce((s, r) => s + r.ng_qty, 0);
    const hourlyTarget = activeRun?.hourly_target ?? 150;
    const totalDt = dtAgg.reduce((s, d) => s + d.total_min, 0);
    const plannedMins = 480;
    const otr = plannedMins > 0 ? Math.max(0, Math.min(100, ((plannedMins - totalDt) / plannedMins) * 100)) : 100;
    const per = hourlyTarget > 0 ? Math.min(100, (totalActual / ((hourlyRaw.length || 1) * hourlyTarget)) * 100) : 100;
    const qr = (totalActual + totalNg) > 0 ? (totalActual / (totalActual + totalNg)) * 100 : 100;
    const oee = (otr * per * qr) / 10000;
    const targetQty = activeRun?.target_qty ?? 0;
    const achievement = targetQty > 0 ? (totalActual / targetQty) * 100 : 0;

    return {
      oee,
      otr,
      per,
      qr,
      totalActual,
      totalNg,
      totalDt,
      achievement,
    };
  }, [activeRun, hourlyRaw, dtAgg]);

  // Check sheet data transformation
  const statusChecks = useMemo((): CheckItem[] => {
    return checkSheets
      .filter(c => c.check_sheet_templates?.kind === "5F5L")
      .sort((a, b) => (a.check_sheet_templates?.sort_order ?? 0) - (b.check_sheet_templates?.sort_order ?? 0))
      .map(c => ({
        label: c.check_sheet_templates?.label ?? "—",
        time: new Date(c.checked_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false}),
        done: c.passed,
      }));
  }, [checkSheets]);

  const autonomousChecks = useMemo((): CheckItem[] => {
    return checkSheets
      .filter(c => c.check_sheet_templates?.kind === "AUTONOMOUS")
      .sort((a, b) => (a.check_sheet_templates?.sort_order ?? 0) - (b.check_sheet_templates?.sort_order ?? 0))
      .map(c => ({
        label: c.check_sheet_templates?.label ?? "—",
        time: new Date(c.checked_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false}),
        done: c.passed,
      }));
  }, [checkSheets]);

  // 4M Condition Status transformation
  const m4Items = useMemo((): M4Item[] => {
    // Filter operators by active line for skill analysis
    const lineSkillRows = activeRun?.line_id 
      ? skillRows.filter(r => r.assigned_line_ids.includes(activeRun.line_id))
      : skillRows;

    // Man — skill gaps & W/I compliance
    const manTotal = lineSkillRows.length;
    const manGap = lineSkillRows.filter(r => r.skills.some(s => s.level < 2)).length;
    const manWiPass = lineSkillRows.filter(r => r.skills.length > 0 && r.skills.every(s => s.wi_pass)).length;
    const allSkills = lineSkillRows.flatMap(r => r.skills);
    const wiPct = allSkills.length > 0 ? Math.round((allSkills.filter(s => s.wi_pass).length / allSkills.length) * 100) : 100;
    const manOk = manGap === 0;

    // Machine — unplanned breakdown events
    const machineEvts = dtRaw.filter(e => {
      const code = e.downtime_categories?.code ?? "";
      return code === "BREAKDOWN" || (e.kind === "unplanned" && code !== "WAITMAT" && code !== "UTIL" && code !== "QHOLD");
    });
    const machineMins = machineEvts.reduce((s, e) => s + e.duration_minutes, 0);

    // Material — waiting for material / utility
    const matEvts = dtRaw.filter(e => {
      const code = e.downtime_categories?.code ?? "";
      return code === "WAITMAT" || code === "UTIL";
    });
    const matMins = matEvts.reduce((s, e) => s + e.duration_minutes, 0);

    // Method — W/I compliance rate
    const methodOk = wiPct >= 80;

    return [
      {
        icon: "👤", label: "Man",
        badge: manOk ? "OK" : "Attention",
        tone: manOk ? "green" : "amber",
        title: manTotal > 0
          ? `${manTotal} operator terdaftar. Skill gap: ${manGap} orang. W/I pass: ${manWiPass}/${manTotal} (${wiPct}%).`
          : "Belum ada data operator untuk line ini.",
      },
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
      {
        icon: "📝", label: "Method",
        badge: methodOk ? "OK" : "Attention",
        tone: methodOk ? "green" : "amber",
        title: allSkills.length > 0
          ? `W/I compliance: ${wiPct}% (${allSkills.filter(s => s.wi_pass).length}/${allSkills.length} skill pass).`
          : "Belum ada data W/I untuk line ini.",
      },
    ];
  }, [dtRaw, skillRows, activeRun]);

  // SCW Events transformation
  const scwEvents = useMemo((): SCWEvent[] => {
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

  // Skill matrix data
  const skillMatrixData = useMemo(() => {
    const lineSkillRows = activeRun?.line_id 
      ? skillRows.filter(r => r.assigned_line_ids.includes(activeRun.line_id))
      : skillRows;

    const skillHeaders = Array.from(new Set(
      lineSkillRows.flatMap(r => r.skills.map(s => s.process_name))
    ));

    const allSkillLevels = lineSkillRows.flatMap(r => r.skills.map(s => s.level));
    const avgSkill = allSkillLevels.length > 0 ? (allSkillLevels.reduce((a, b) => a + b, 0) / allSkillLevels.length) : 0;
    const wiPassCount = lineSkillRows.filter(r => r.skills.length > 0 && r.skills.every(s => s.wi_pass)).length;
    const wiPassPct = lineSkillRows.length > 0 ? Math.round((wiPassCount / lineSkillRows.length) * 100) : 0;
    const gapCount = lineSkillRows.filter(r => r.skills.some(s => s.level < 2)).length;

    return {
      lineSkillRows,
      skillHeaders,
      avgSkill,
      wiPassCount,
      wiPassPct,
      gapCount,
    };
  }, [skillRows, activeRun]);

  return {
    productionMetrics,
    oeeMetrics,
    statusChecks,
    autonomousChecks,
    m4Items,
    scwEvents,
    skillMatrixData,
    ngAgg,
    dtAgg,
    hourlyRaw,
  };
}
