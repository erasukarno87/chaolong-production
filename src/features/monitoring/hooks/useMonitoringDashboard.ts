/**
 * Monitoring Dashboard Hook
 * Combines all monitoring data, calculations, and transformations
 * Provides a single interface for dashboard components
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
import { ProductionCalculations } from "@/features/monitoring/services/productionCalculations";
import { 
  ProductionMetrics, 
  OEEMetrics, 
  QualityMetrics, 
  DowntimeMetrics,
  CheckItem,
  M4Item,
  SCWEvent,
  MonitoringUIState,
  DashboardPanel,
  DensityMode
} from "@/types/monitoring.types";

export interface UseMonitoringDashboardReturn {
  // UI State
  uiState: MonitoringUIState;
  setDensity: (density: DensityMode) => void;
  setDarkMode: (darkMode: boolean) => void;
  setActivePanel: (panel: DashboardPanel) => void;
  refreshDashboard: () => void;
  
  // Raw Data
  activeRun: ReturnType<typeof useMonitoringRun>["data"];
  hourlyRaw: ReturnType<typeof useMonitoringHourly>["data"];
  ngAgg: ReturnType<typeof useMonitoringNg>["data"];
  dtAgg: ReturnType<typeof useMonitoringDowntime>["data"];
  dtRaw: ReturnType<typeof useMonitoringDowntimeRaw>["data"];
  checkSheets: ReturnType<typeof useMonitoringCheckSheets>["data"];
  skillRows: ReturnType<typeof useMonitoringSkills>["data"];
  
  // Calculated Metrics
  productionMetrics: ProductionMetrics | null;
  oeeMetrics: OEEMetrics | null;
  qualityMetrics: QualityMetrics | null;
  downtimeMetrics: DowntimeMetrics | null;
  
  // Transformed Data
  statusChecks: CheckItem[];
  autonomousChecks: CheckItem[];
  m4Items: M4Item[];
  scwEvents: SCWEvent[];
  skillMatrixData: ReturnType<typeof ProductionCalculations.calculateSkillMatrix>;
  
  // Loading States
  isLoading: boolean;
  isRunLoading: boolean;
  hasData: boolean;
  isEmpty: boolean;
  
  // Real-time Status
  isLive: boolean;
  connectionStatus: "live" | "error" | "connecting";
}

export function useMonitoringDashboard(): UseMonitoringDashboardReturn {
  // UI State Management
  const [activePanel, setActivePanel] = useState<DashboardPanel>("status");
  const [density, setDensity] = useState<DensityMode>("comfortable");
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
  const uiState = useMemo((): MonitoringUIState => ({
    activePanel,
    density,
    isDarkMode,
    currentTime,
    isLive,
  }), [activePanel, density, isDarkMode, currentTime, isLive]);

  // Calculated Metrics - Memoized for performance
  const productionMetrics = useMemo(() => {
    if (!hourlyRaw.length || !activeRun) return null;
    return ProductionCalculations.calculateProductionMetrics(hourlyRaw, activeRun);
  }, [hourlyRaw, activeRun, currentTime]);

  const oeeMetrics = useMemo(() => {
    if (!hourlyRaw.length || !activeRun) return null;
    return ProductionCalculations.calculateOEEMetrics(hourlyRaw, dtAgg, activeRun);
  }, [hourlyRaw, dtAgg, activeRun]);

  const qualityMetrics = useMemo(() => {
    if (!hourlyRaw.length) return null;
    return ProductionCalculations.calculateQualityMetrics(hourlyRaw, ngAgg);
  }, [hourlyRaw, ngAgg]);

  const downtimeMetrics = useMemo(() => {
    return ProductionCalculations.calculateDowntimeMetrics(dtAgg);
  }, [dtAgg]);

  // Transformed Data - Memoized for performance
  const statusChecks = useMemo(() => {
    return ProductionCalculations.transformCheckSheets(checkSheets, "5F5L");
  }, [checkSheets]);

  const autonomousChecks = useMemo(() => {
    return ProductionCalculations.transformCheckSheets(checkSheets, "AUTONOMOUS");
  }, [checkSheets]);

  const m4Items = useMemo(() => {
    return ProductionCalculations.calculateM4Items(skillRows, dtRaw, activeRun?.line_id);
  }, [skillRows, dtRaw, activeRun?.line_id]);

  const scwEvents = useMemo(() => {
    return ProductionCalculations.transformSCWEvents(dtRaw);
  }, [dtRaw]);

  const skillMatrixData = useMemo(() => {
    return ProductionCalculations.calculateSkillMatrix(skillRows, activeRun?.line_id);
  }, [skillRows, activeRun?.line_id]);

  // Loading States
  const isLoading = runLoading;
  const hasData = !!(activeRun || hourlyRaw.length || checkSheets.length || skillRows.length);
  const isEmpty = !hasData && !isLoading;

  // UI Actions
  const handleDensityChange = useCallback((newDensity: DensityMode) => {
    setDensity(newDensity);
  }, []);

  const handleDarkModeToggle = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  const handlePanelChange = useCallback((panel: DashboardPanel) => {
    setActivePanel(panel);
  }, []);

  const refreshDashboard = useCallback(async () => {
    setCurrentTime(new Date());
    await refetchRun();
  }, [refetchRun]);

  return {
    // UI State
    uiState,
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
    qualityMetrics,
    downtimeMetrics,
    
    // Transformed Data
    statusChecks,
    autonomousChecks,
    m4Items,
    scwEvents,
    skillMatrixData,
    
    // Loading States
    isLoading,
    isRunLoading: runLoading,
    hasData,
    isEmpty,
    
    // Real-time Status
    isLive,
    connectionStatus,
  };
}

/**
 * Hook for specific panel data
 * Optimized for individual panel components
 */
export function useMonitoringPanel(panel: DashboardPanel) {
  const dashboard = useMonitoringDashboard();
  
  return useMemo(() => {
    switch (panel) {
      case "status":
        return {
          productionMetrics: dashboard.productionMetrics,
          statusChecks: dashboard.statusChecks,
          autonomousChecks: dashboard.autonomousChecks,
          hourlyRaw: dashboard.hourlyRaw,
          activeRun: dashboard.activeRun,
        };
      case "oee":
        return {
          oeeMetrics: dashboard.oeeMetrics,
          qualityMetrics: dashboard.qualityMetrics,
          downtimeMetrics: dashboard.downtimeMetrics,
          ngAgg: dashboard.ngAgg,
          dtAgg: dashboard.dtAgg,
          m4Items: dashboard.m4Items,
          scwEvents: dashboard.scwEvents,
        };
      case "skill":
        return {
          skillMatrixData: dashboard.skillMatrixData,
          skillRows: dashboard.skillRows,
          activeRun: dashboard.activeRun,
        };
      default:
        return {};
    }
  }, [dashboard, panel]);
}

/**
 * Hook for monitoring alerts and notifications
 */
export function useMonitoringAlerts() {
  const { oeeMetrics, qualityMetrics, downtimeMetrics } = useMonitoringDashboard();
  
  const alerts = useMemo(() => {
    const alertList = [];
    
    // OEE Alerts
    if (oeeMetrics && oeeMetrics.oee < 65) {
      alertList.push({
        id: "oee-critical",
        type: "danger" as const,
        title: "OEE Critical",
        message: `OEE below acceptable threshold (${oeeMetrics.oee.toFixed(1)}%)`,
        timestamp: new Date(),
        acknowledged: false,
        actionRequired: true,
      });
    } else if (oeeMetrics && oeeMetrics.oee < 75) {
      alertList.push({
        id: "oee-warning",
        type: "warning" as const,
        title: "OEE Below Target",
        message: `OEE improvement needed (${oeeMetrics.oee.toFixed(1)}%)`,
        timestamp: new Date(),
        acknowledged: false,
        actionRequired: false,
      });
    }
    
    // Quality Alerts
    if (qualityMetrics && qualityMetrics.status === "critical") {
      alertList.push({
        id: "quality-critical",
        type: "danger" as const,
        title: "Quality Issue",
        message: `NG ratio critical (${qualityMetrics.ngRatio.toFixed(2)}%)`,
        timestamp: new Date(),
        acknowledged: false,
        actionRequired: true,
      });
    }
    
    // Downtime Alerts
    if (downtimeMetrics && downtimeMetrics.status === "critical") {
      alertList.push({
        id: "downtime-critical",
        type: "warning" as const,
        title: "High Downtime",
        message: `Downtime loss ${downtimeMetrics.lossPercentage.toFixed(1)}%`,
        timestamp: new Date(),
        acknowledged: false,
        actionRequired: false,
      });
    }
    
    return alertList;
  }, [oeeMetrics, qualityMetrics, downtimeMetrics]);
  
  return {
    alerts,
    alertCount: alerts.length,
    hasCriticalAlerts: alerts.some(a => a.type === "danger"),
    hasWarnings: alerts.some(a => a.type === "warning"),
  };
}
