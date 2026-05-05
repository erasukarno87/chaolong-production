/**
 * Centralized type definitions for monitoring system
 * Single source of truth for all monitoring-related types
 */

// ============================================================================
// CORE DATA TYPES
// ============================================================================

export interface CheckItem {
  label: string;
  time: string;
  done: boolean;
}

export interface HourPoint {
  hour: string;
  actual: number;
  target: number;
  note: string;
}

export interface RatioItem {
  label: string;
  value: string;
  pct: number;
  tone: "blue" | "green" | "amber" | "red" | "purple";
}

export interface SkillRow {
  name: string;
  initials: string;
  join: string;
  skills: SkillLevel[];
  wi: "PASS" | "CHECK" | "FAIL";
}

export interface SkillLevel {
  process_name: string;
  level: number;
  wi_pass: boolean;
}

// ============================================================================
// MONITORING DATA TYPES
// ============================================================================

export interface MonitoringRun {
  id: string;
  line_id: string;
  target_qty: number;
  hourly_target: number;
  status: string;
  started_at: string | null;
  lines?: { code: string; name: string };
  products?: { code: string; name: string; model: string | null };
  shifts?: { name: string; start_time: string; end_time: string };
}

export interface MonHourlyOutput {
  id: string;
  hour_index: number;
  hour_label: string;
  actual_qty: number;
  ng_qty: number;
  downtime_minutes: number;
  is_break: boolean;
  note: string | null;
}

export interface MonNGAgg {
  defect_name: string;
  total_qty: number;
  pct: number;
}

export interface MonDowntimeAgg {
  category_name: string;
  total_min: number;
  pct: number;
}

export interface MonDowntimeRaw {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  kind: "planned" | "unplanned";
  root_cause?: string;
  action_taken?: string;
  downtime_categories?: {
    code: string;
    name: string;
  } | null;
}

export interface MonCheckSheet {
  id: string;
  checked_at: string;
  passed: boolean;
  check_sheet_templates?: {
    kind: "5F5L" | "AUTONOMOUS";
    label: string;
    sort_order?: number;
  };
}

export interface MonSkill {
  operator_id: string;
  full_name: string;
  initials?: string;
  join_date: string;
  assigned_line_ids: string[];
  skills: SkillLevel[];
}

// ============================================================================
// TRANSFORMED DATA TYPES
// ============================================================================

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

// ============================================================================
// CALCULATED METRICS TYPES
// ============================================================================

export interface ProductionMetrics {
  totalActual: number;
  totalNg: number;
  targetQty: number;
  hourlyTarget: number;
  achievement: number;
  startTime: Date | null;
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

export interface QualityMetrics {
  ngRatio: number;
  totalDefects: number;
  totalProduction: number;
  status: "excellent" | "good" | "acceptable" | "critical";
}

export interface DowntimeMetrics {
  totalMinutes: number;
  plannedMinutes: number;
  availabilityRate: number;
  lossPercentage: number;
  status: "excellent" | "good" | "concerning" | "critical";
}

export interface SkillMetrics {
  totalOperators: number;
  averageSkillLevel: number;
  wiComplianceRate: number;
  skillGapCount: number;
  status: "excellent" | "good" | "concerning" | "critical";
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export type DashboardPanel = "status" | "oee" | "skill";
export type DensityMode = "compact" | "comfortable";
export type ViewMode = "light" | "dark";

export interface MonitoringUIState {
  activePanel: DashboardPanel;
  density: DensityMode;
  isDarkMode: boolean;
  currentTime: Date;
  isLive: boolean;
}

// ============================================================================
// ALERT & NOTIFICATION TYPES
// ============================================================================

export interface MonitoringAlert {
  id: string;
  type: "info" | "warning" | "danger" | "success";
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  actionRequired?: boolean;
  actionUrl?: string;
}

export interface ProductionTarget {
  quantity: number;
  hourlyTarget: number;
  achievement: number;
  status: "on-track" | "at-risk" | "behind" | "exceeded";
  timeRemaining: number;
  isOvertime: boolean;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface MonitoringApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

export interface MonitoringError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface MonitoringConfig {
  refreshInterval: number;
  realtimeEnabled: boolean;
  autoRetry: boolean;
  maxRetries: number;
  cacheDuration: number;
  alertThresholds: {
    oee: number;
    ngRatio: number;
    downtime: number;
    skillCompliance: number;
  };
}

export interface PanelConfig {
  id: DashboardPanel;
  label: string;
  icon: string;
  enabled: boolean;
  permissions: string[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type MonitoringStatus = "running" | "setup" | "completed" | "paused";
export type ConnectionStatus = "online" | "offline" | "slow" | "error";
export type LoadingState = "idle" | "loading" | "success" | "error";

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface MonitoringValidationRule {
  field: string;
  required: boolean;
  type: "string" | "number" | "date" | "boolean";
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface MonitoringValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
}

