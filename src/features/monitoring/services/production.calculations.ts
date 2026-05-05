/**
 * Production Calculations Service
 * Pure business logic for production metrics and calculations
 * No UI dependencies - can be tested independently
 */

import { 
  ProductionMetrics, 
  OEEMetrics, 
  QualityMetrics, 
  DowntimeMetrics,
  MonHourlyOutput,
  MonitoringRun,
  MonNGAgg,
  MonDowntimeAgg,
  MonDowntimeRaw,
  MonCheckSheet,
  MonSkill,
  CheckItem,
  M4Item,
  SCWEvent
} from "@/types/monitoring.types";

export class ProductionCalculations {
  /**
   * Calculate production metrics from raw hourly data
   */
  static calculateProductionMetrics(
    hourlyRaw: MonHourlyOutput[],
    activeRun: MonitoringRun | null
  ): ProductionMetrics {
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
  }

  /**
   * Calculate OEE metrics from production and downtime data
   */
  static calculateOEEMetrics(
    hourlyRaw: MonHourlyOutput[],
    dtAgg: MonDowntimeAgg[],
    activeRun: MonitoringRun | null
  ): OEEMetrics {
    const totalActual = hourlyRaw.reduce((s, r) => s + r.actual_qty, 0);
    const totalNg = hourlyRaw.reduce((s, r) => s + r.ng_qty, 0);
    const hourlyTarget = activeRun?.hourly_target ?? 150;
    const totalDt = dtAgg.reduce((s, d) => s + d.total_min, 0);
    const plannedMins = 480; // 8 hours shift
    
    // OEE Components
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
  }

  /**
   * Calculate quality metrics from production data
   */
  static calculateQualityMetrics(
    hourlyRaw: MonHourlyOutput[],
    ngAgg: MonNGAgg[]
  ): QualityMetrics {
    const totalActual = hourlyRaw.reduce((s, r) => s + r.actual_qty, 0);
    const totalNg = hourlyRaw.reduce((s, r) => s + r.ng_qty, 0);
    const totalDefects = ngAgg.reduce((s, item) => s + item.total_qty, 0);
    const totalProduction = totalActual + totalNg;
    const ngRatio = totalProduction > 0 ? (totalNg / totalProduction) * 100 : 0;

    let status: QualityMetrics["status"];
    if (ngRatio <= 1) status = "excellent";
    else if (ngRatio <= 2) status = "good";
    else if (ngRatio <= 5) status = "acceptable";
    else status = "critical";

    return {
      ngRatio,
      totalDefects,
      totalProduction,
      status,
    };
  }

  /**
   * Calculate downtime metrics
   */
  static calculateDowntimeMetrics(
    dtAgg: MonDowntimeAgg[],
    plannedMinutes: number = 480
  ): DowntimeMetrics {
    const totalMinutes = dtAgg.reduce((s, d) => s + d.total_min, 0);
    const availabilityRate = ((plannedMinutes - totalMinutes) / plannedMinutes) * 100;
    const lossPercentage = (totalMinutes / plannedMinutes) * 100;

    let status: DowntimeMetrics["status"];
    if (availabilityRate >= 95) status = "excellent";
    else if (availabilityRate >= 90) status = "good";
    else if (availabilityRate >= 80) status = "concerning";
    else status = "critical";

    return {
      totalMinutes,
      plannedMinutes,
      availabilityRate,
      lossPercentage,
      status,
    };
  }

  /**
   * Transform check sheets into status check items
   */
  static transformCheckSheets(
    checkSheets: MonCheckSheet[],
    kind: "5F5L" | "AUTONOMOUS"
  ): CheckItem[] {
    return checkSheets
      .filter(c => c.check_sheet_templates?.kind === kind)
      .sort((a, b) => (a.check_sheet_templates?.sort_order ?? 0) - (b.check_sheet_templates?.sort_order ?? 0))
      .map(c => ({
        label: c.check_sheet_templates?.label ?? "—",
        time: new Date(c.checked_at).toLocaleTimeString("id-ID", { 
          hour: "2-digit", 
          minute: "2-digit", 
          hour12: false 
        }),
        done: c.passed,
      }));
  }

  /**
   * Calculate 4M condition status from skill and downtime data
   */
  static calculateM4Items(
    skillRows: MonSkill[],
    dtRaw: MonDowntimeRaw[],
    activeLineId?: string
  ): M4Item[] {
    // Filter operators by active line
    const lineSkillRows = activeLineId 
      ? skillRows.filter(r => r.assigned_line_ids.includes(activeLineId))
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
  }

  /**
   * Transform downtime entries to SCW events
   */
  static transformSCWEvents(dtRaw: MonDowntimeRaw[]): SCWEvent[] {
    return dtRaw.map(e => {
      const code = e.downtime_categories?.code ?? "";
      const marker: "STOP" | "CALL" | "WAIT" =
        code === "BREAKDOWN" ? "STOP" :
        code === "QHOLD"     ? "CALL" : "WAIT";

      const startStr = new Date(e.started_at).toLocaleTimeString("id-ID", { 
        hour: "2-digit", 
        minute: "2-digit", 
        hour12: false 
      });
      
      const endStr = e.ended_at
        ? new Date(e.ended_at).toLocaleTimeString("id-ID", { 
            hour: "2-digit", 
            minute: "2-digit", 
            hour12: false 
          })
        : null;
        
      const timeStr = endStr
        ? `${startStr} – ${endStr} (${e.duration_minutes} mnt)`
        : `${startStr} (${e.kind === "unplanned" ? "On-going" : "Pending"})`;

      const badge: "Resolved" | "On-going" | "Pending" = e.ended_at
        ? "Resolved"
        : e.kind === "unplanned" ? "On-going" : "Pending";

      const catName = e.downtime_categories?.name ?? e.kind;
      const label = e.root_cause ? `${catName} — ${e.root_cause}` : catName;
      const meta = e.action_taken ?? "";

      return { 
        id: e.id, 
        marker, 
        label, 
        time: timeStr, 
        badge, 
        meta 
      };
    });
  }

  /**
   * Calculate skill matrix data
   */
  static calculateSkillMatrix(
    skillRows: MonSkill[],
    activeLineId?: string
  ) {
    const lineSkillRows = activeLineId 
      ? skillRows.filter(r => r.assigned_line_ids.includes(activeLineId))
      : skillRows;

    // Skill column headers = unique process names from operators on this line
    const skillHeaders = Array.from(new Set(
      lineSkillRows.flatMap(r => r.skills.map(s => s.process_name))
    ));

    // Skill metrics
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
  }

  /**
   * Format duration in human-readable format
   */
  static formatDuration(start: Date, now: Date): string {
    const diffMs = Math.max(0, now.getTime() - start.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}j ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}d`;
  }

  /**
   * Calculate shift progress
   */
  static calculateShiftProgress(
    startTime: Date,
    endTime: Date,
    currentTime: Date
  ) {
    const totalShiftMs = endTime.getTime() - startTime.getTime();
    const elapsedMs = currentTime.getTime() - startTime.getTime();
    const remainingMs = Math.max(0, endTime.getTime() - currentTime.getTime());

    const progress = Math.min(100, Math.max(0, (elapsedMs / totalShiftMs) * 100));
    const timeRemaining = remainingMs / totalShiftMs;
    const isOvertime = currentTime > endTime;

    return { progress, timeRemaining, isOvertime };
  }

  /**
   * Get skill level styling classes
   */
  static getSkillTone(level: number): string {
    if (level === 0) return "bg-slate-100 text-slate-500 border-slate-300";
    if (level === 1) return "bg-amber-100 text-amber-900 border-amber-400";
    if (level === 2) return "bg-blue-100 text-blue-700 border-blue-500";
    if (level === 3) return "bg-emerald-100 text-emerald-800 border-emerald-500";
    return "bg-violet-100 text-violet-800 border-violet-500";
  }

  /**
   * Get skill level label
   */
  static getSkillLabel(level: number): string {
    return ["0", "1", "2", "3", "4"][level] ?? "0";
  }

  /**
   * Get tone classes for ratio items
   */
  static getToneClasses(tone: "blue" | "green" | "amber" | "red" | "purple") {
    switch (tone) {
      case "blue": return { 
        pill: "bg-blue-100 text-blue-700", 
        fill: "bg-gradient-to-r from-[#1A6EFA] to-[#60A5FA]", 
        value: "text-[#1A6EFA]" 
      };
      case "green": return { 
        pill: "bg-emerald-100 text-emerald-700", 
        fill: "bg-gradient-to-r from-[#00B37D] to-[#34D399]", 
        value: "text-[#00B37D]" 
      };
      case "amber": return { 
        pill: "bg-amber-100 text-amber-700", 
        fill: "bg-gradient-to-r from-[#F59E0B] to-[#FCD34D]", 
        value: "text-[#F59E0B]" 
      };
      case "red": return { 
        pill: "bg-red-100 text-red-700", 
        fill: "bg-gradient-to-r from-[#EF4444] to-[#FC8181]", 
        value: "text-[#EF4444]" 
      };
      case "purple": return { 
        pill: "bg-violet-100 text-violet-700", 
        fill: "bg-gradient-to-r from-[#8B5CF6] to-[#C4B5FD]", 
        value: "text-[#8B5CF6]" 
      };
      default: return { 
        pill: "bg-slate-100 text-slate-700", 
        fill: "bg-slate-400", 
        value: "text-slate-700" 
      };
    }
  }
}
