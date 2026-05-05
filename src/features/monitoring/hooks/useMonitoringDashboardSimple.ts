/**
 * Simple Monitoring Dashboard Hook
 * Works with existing codebase without breaking changes
 * Provides clean interface for dashboard components
 */

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  useMonitoringRun,
  useMonitoringHourly,
  useMonitoringNg,
  useMonitoringDowntime,
  useMonitoringDowntimeRaw,
  useMonitoringCheckSheets,
  useMonitoringSkills,
  useMonitoringRealtime,
} from "@/hooks/useMonitoring";

// Use existing types from hooks to avoid conflicts
import type { 
  MonHourlyOutput,
  MonNgAgg,
  MonDowntimeRaw,
  MonCheckResult,
  MonSkillRow,
  MonitoringRun,
  MonDtAgg
} from "@/hooks/useMonitoring";

// Simple interface definitions that work with existing types
export interface SimpleProductionMetrics {
  totalActual: number;
  totalNg: number;
  targetQty: number;
  hourlyTarget: number;
  achievement: number;
  startTime: Date | null;
}

export interface SimpleOEEMetrics {
  oee: number;
  otr: number;
  per: number;
  qr: number;
  totalActual: number;
  totalNg: number;
  totalDt: number;
  achievement: number;
}

export interface SimpleCheckItem {
  label: string;
  time: string;
  done: boolean;
}

export interface SimpleM4Item {
  icon: string;
  label: string;
  badge: string;
  tone: "green" | "amber";
  title: string;
}

export interface SimpleSCWEvent {
  id: string;
  marker: "STOP" | "CALL" | "WAIT";
  label: string;
  time: string;
  badge: "Resolved" | "On-going" | "Pending";
  meta: string;
}

export interface SimpleSkillMatrix {
  lineSkillRows: MonSkillRow[];
  skillHeaders: string[];
  avgSkill: number;
  wiPassCount: number;
  wiPassPct: number;
  gapCount: number;
}

export interface SimpleDashboardUI {
  activePanel: "status" | "oee" | "skill";
  density: "compact" | "comfortable";
  isDarkMode: boolean;
  currentTime: Date;
  isLive: boolean;
}

export interface UseSimpleMonitoringDashboardReturn {
  // UI State
  ui: SimpleDashboardUI;
  setDensity: (density: "compact" | "comfortable") => void;
  setDarkMode: (darkMode: boolean) => void;
  setActivePanel: (panel: "status" | "oee" | "skill") => void;
  refreshDashboard: () => void;
  
  // Raw Data
  activeRun: MonitoringRun | null | undefined;
  hourlyRaw: MonHourlyOutput[];
  ngAgg: MonNgAgg[];
  dtAgg: MonDtAgg[];
  dtRaw: MonDowntimeRaw[];
  checkSheets: MonCheckResult[];
  skillRows: MonSkillRow[];
  
  // Calculated Metrics
  productionMetrics: SimpleProductionMetrics | null;
  oeeMetrics: SimpleOEEMetrics | null;
  
  // Transformed Data
  statusChecks: SimpleCheckItem[];
  autonomousChecks: SimpleCheckItem[];
  m4Items: SimpleM4Item[];
  scwEvents: SimpleSCWEvent[];
  skillMatrix: SimpleSkillMatrix | null;
  
  // Loading States
  isLoading: boolean;
  hasData: boolean;
  isEmpty: boolean;
  
  // Real-time Status
  isLive: boolean;
  connectionStatus: "live" | "error" | "connecting";
}

// Simple calculation functions that work with existing types
class SimpleCalculations {
  static calculateProductionMetrics(
    hourlyRaw: MonHourlyOutput[],
    activeRun: MonitoringRun | null
  ): SimpleProductionMetrics {
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

  static calculateOEEMetrics(
    hourlyRaw: MonHourlyOutput[],
    dtAgg: any[],
    activeRun: MonitoringRun | null
  ): SimpleOEEMetrics {
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
  }

  static transformCheckSheets(
    checkSheets: MonCheckResult[],
    kind: "5F5L" | "AUTONOMOUS"
  ): SimpleCheckItem[] {
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

  static calculateM4Items(
    skillRows: MonSkillRow[],
    dtRaw: MonDowntimeRaw[],
    activeLineId?: string
  ): SimpleM4Item[] {
    const lineSkillRows = activeLineId 
      ? skillRows.filter(r => r.assigned_line_ids.includes(activeLineId))
      : skillRows;

    const manTotal = lineSkillRows.length;
    const manGap = lineSkillRows.filter(r => r.skills.some(s => s.level < 2)).length;
    const manWiPass = lineSkillRows.filter(r => r.skills.length > 0 && r.skills.every(s => s.wi_pass)).length;
    const allSkills = lineSkillRows.flatMap(r => r.skills);
    const wiPct = allSkills.length > 0 ? Math.round((allSkills.filter(s => s.wi_pass).length / allSkills.length) * 100) : 100;
    const manOk = manGap === 0;

    const machineEvts = dtRaw.filter(e => {
      const code = e.downtime_categories?.code ?? "";
      return code === "BREAKDOWN" || (e.kind === "unplanned" && code !== "WAITMAT" && code !== "UTIL" && code !== "QHOLD");
    });

    const matEvts = dtRaw.filter(e => {
      const code = e.downtime_categories?.code ?? "";
      return code === "WAITMAT" || code === "UTIL";
    });

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
          ? `${machineEvts.length} event breakdown. Total downtime unplanned: ${machineEvts.reduce((s, e) => s + e.duration_minutes, 0)} mnt.`
          : "Tidak ada breakdown tercatat pada shift ini.",
      },
      {
        icon: "📦", label: "Material",
        badge: matEvts.length === 0 ? "OK" : "Attention",
        tone: matEvts.length === 0 ? "green" : "amber",
        title: matEvts.length > 0
          ? `${matEvts.length} event tunggu material/utility. Total: ${matEvts.reduce((s, e) => s + e.duration_minutes, 0)} mnt.`
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

  static transformSCWEvents(dtRaw: MonDowntimeRaw[]): SimpleSCWEvent[] {
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

  static calculateSkillMatrix(
    skillRows: MonSkillRow[],
    activeLineId?: string
  ): SimpleSkillMatrix | null {
    const lineSkillRows = activeLineId 
      ? skillRows.filter(r => r.assigned_line_ids.includes(activeLineId))
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
  }
}

export function useSimpleMonitoringDashboard(): UseSimpleMonitoringDashboardReturn {
  // UI State Management
  const [activePanel, setActivePanel] = useState<"status" | "oee" | "skill">("status");
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Data Fetching
  const { data: activeRun, isLoading: runLoading, refetch: refetchRun } = useMonitoringRun();
  const { data: hourlyRaw = [] } = useMonitoringHourly(activeRun?.id);
  const { data: ngAgg = [] } = useMonitoringNg(activeRun?.id);
  const { data: dtAgg = [] } = useMonitoringDowntime(activeRun?.id);
  const { data: dtRaw = [] } = useMonitoringDowntimeRaw(activeRun?.id);
  const { data: checkSheets = [] } = useMonitoringCheckSheets(activeRun?.id);
  const { data: skillRows = [] } = useMonitoringSkills();

  // Real-time Connection
  const subStatus = useMonitoringRealtime(activeRun?.id);
  const isLive = subStatus === "live";
  const connectionStatus = subStatus === "live" ? "live" : subStatus === "error" ? "error" : "connecting";

  // Clock Update
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Dark Mode Toggle
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    return () => document.documentElement.classList.remove("dark");
  }, [isDarkMode]);

  // UI State Object
  const ui = useMemo((): SimpleDashboardUI => ({
    activePanel,
    density,
    isDarkMode,
    currentTime,
    isLive,
  }), [activePanel, density, isDarkMode, currentTime, isLive]);

  // Calculated Metrics - Memoized for performance
  const productionMetrics = useMemo(() => {
    if (!hourlyRaw.length || !activeRun) return null;
    return SimpleCalculations.calculateProductionMetrics(hourlyRaw, activeRun);
  }, [hourlyRaw, activeRun]);

  const oeeMetrics = useMemo(() => {
    if (!hourlyRaw.length || !activeRun) return null;
    return SimpleCalculations.calculateOEEMetrics(hourlyRaw, dtAgg, activeRun);
  }, [hourlyRaw, dtAgg, activeRun]);

  // Transformed Data - Memoized for performance
  const statusChecks = useMemo(() => {
    return SimpleCalculations.transformCheckSheets(checkSheets, "5F5L");
  }, [checkSheets]);

  const autonomousChecks = useMemo(() => {
    return SimpleCalculations.transformCheckSheets(checkSheets, "AUTONOMOUS");
  }, [checkSheets]);

  const m4Items = useMemo(() => {
    return SimpleCalculations.calculateM4Items(skillRows, dtRaw, activeRun?.line_id);
  }, [skillRows, dtRaw, activeRun?.line_id]);

  const scwEvents = useMemo(() => {
    return SimpleCalculations.transformSCWEvents(dtRaw);
  }, [dtRaw]);

  const skillMatrix = useMemo(() => {
    return SimpleCalculations.calculateSkillMatrix(skillRows, activeRun?.line_id);
  }, [skillRows, activeRun?.line_id]);

  // Loading States
  const isLoading = runLoading;
  const hasData = !!(activeRun || hourlyRaw.length || checkSheets.length || skillRows.length);
  const isEmpty = !hasData && !isLoading;

  // UI Actions
  const handleDensityChange = useCallback((newDensity: "compact" | "comfortable") => {
    setDensity(newDensity);
  }, []);

  const handleDarkModeToggle = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  const handlePanelChange = useCallback((panel: "status" | "oee" | "skill") => {
    setActivePanel(panel);
  }, []);

  const refreshDashboard = useCallback(async () => {
    setCurrentTime(new Date());
    await refetchRun();
  }, [refetchRun]);

  return {
    // UI State
    ui,
    setDensity: handleDensityChange,
    setDarkMode: handleDarkModeToggle,
    setActivePanel: handlePanelChange,
    refreshDashboard,
    
    // Raw Data
    activeRun,
    hourlyRaw,
    ngAgg,
    dtAgg,
    dtRaw,
    checkSheets,
    skillRows,
    
    // Calculated Metrics
    productionMetrics,
    oeeMetrics,
    
    // Transformed Data
    statusChecks,
    autonomousChecks,
    m4Items,
    scwEvents,
    skillMatrix,
    
    // Loading States
    isLoading,
    hasData,
    isEmpty,
    
    // Real-time Status
    isLive,
    connectionStatus,
  };
}
