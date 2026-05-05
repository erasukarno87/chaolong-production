/**
 * Unified type definitions for Autonomous Maintenance feature
 * 
 * This file provides a single source of truth for all Autonomous-related types,
 * bridging the gap between database schemas and UI components.
 */

// Removed unused import: RealtimePostgresChangeset

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK STATUS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type CheckStatus = "pending" | "in_progress" | "pass" | "fail" | "na" | "completed" | "in-progress";

/** Map UI status to DB-compatible status */
export function mapStatusToDB(status: CheckStatus): "pending" | "in_progress" | "pass" | "fail" | "na" {
  if (status === "completed") return "pass";
  if (status === "in-progress") return "in_progress";
  return status as "pending" | "in_progress" | "pass" | "fail" | "na";
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI COMPONENT TYPES (EnhancedStep3AutoCheckSheet)
// ═══════════════════════════════════════════════════════════════════════════════

export type CheckPriority = "low" | "medium" | "high" | "critical";
export type CheckCategory = "machine" | "material" | "5s" | "wi" | "mesin" | "material" | "5s" | "work-instruction";

export interface CheckItem {
  id: string;
  category: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  priority: CheckPriority;
  estimatedTime: number;
  actualTime?: number;
  notes?: string;
  photoRequired?: boolean;
  photoTaken?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE TYPES (Supabase)
// ═══════════════════════════════════════════════════════════════════════════════

export interface AutonomousCheckItemDB {
  id: string;
  line_id: string;
  process_id: string | null;
  code: string;
  name: string;
  category: string;
  frequency: string;
  standard: string | null;
  method: string | null;
  is_critical: boolean;
  item_type: "pass_fail" | "measurement" | "photo" | "yes_no";
  target_value: string | null;
  tolerance: string | null;
  measurement_unit: string | null;
  max_time_seconds: number | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface AutonomousCheckResultDB {
  id: string;
  shift_run_id: string;
  check_item_id: string;
  status: CheckStatus;
  measured_value: number | null;
  note: string | null;
  photo_urls: string[] | null;
  started_at: string | null;
  completed_at: string | null;
  checked_by_operator_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AutonomousCheckResultWithItem extends AutonomousCheckResultDB {
  autonomous_check_items: Pick<AutonomousCheckItemDB, 
    | "code"
    | "name"
    | "category"
    | "standard"
    | "method"
    | "is_critical"
    | "item_type"
    | "target_value"
    | "tolerance"
    | "measurement_unit"
    | "max_time_seconds"
    | "sort_order"
  >;
}

export interface AutonomousCheckSummaryDB {
  id: string;
  shift_run_id: string;
  check_session: "first" | "last";
  total_items: number;
  passed_items: number;
  failed_items: number;
  na_items: number;
  compliance_rate: number;
  overall_passed: boolean;
  completed_at: string | null;
  created_by_operator_id: string | null;
  created_at: string;
  updated_at: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT TYPES (for UI display)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CheckItemResult {
  id: string;
  shift_run_id: string;
  check_item_id: string;
  status: CheckStatus;
  measured_value?: number;
  note?: string;
  photo_urls?: string[];
  started_at?: string;
  completed_at?: string;
  checked_by_operator_id?: string;
  // Joined data
  item_code?: string;
  item_name?: string;
  category?: string;
  standard?: string;
  method?: string;
  is_critical?: boolean;
  item_type?: "pass_fail" | "measurement" | "photo" | "yes_no";
  target_value?: string;
  tolerance?: string;
  measurement_unit?: string;
  max_time_seconds?: number;
  sort_order?: number;
}

export interface ComplianceSummary {
  total_items: number;
  passed_items: number;
  failed_items: number;
  na_items: number;
  compliance_rate: number;
  critical_total: number;
  critical_failed: number;
  overall_passed: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/** Map database check item to UI format */
export function mapDbCheckItemToUI(db: AutonomousCheckItemDB): CheckItem {
  return {
    id: db.id,
    category: mapDbCategoryToUICategory(db.category),
    title: db.name,
    description: db.standard || db.method || "",
    status: "pending",
    priority: db.is_critical ? "critical" : "medium",
    estimatedTime: db.max_time_seconds || 30,
    photoRequired: db.item_type === "photo",
  };
}

/** Map database category to UI category */
export function mapDbCategoryToUICategory(category: string): CheckItem["category"] {
  const categoryMap: Record<string, CheckItem["category"]> = {
    "Mesin": "machine",
    "Keperluan Mesin": "machine",
    "Material": "material",
    "Keperluan Material": "material",
    "5S": "5s",
    "Work Instruction": "wi",
    "Work Instruction": "wi",
  };
  return categoryMap[category] ?? "machine";
}

/** Map UI category to database category */
export function mapUICategoryToDBCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    "machine": "Mesin",
    "material": "Material",
    "5s": "5S",
    "wi": "Work Instruction",
  };
  return categoryMap[category] ?? category;
}

/** Calculate compliance summary from results */
export function calculateCompliance(results: CheckItemResult[]): ComplianceSummary {
  const total = results.length;
  const passed = results.filter(r => r.status === "pass" || r.status === "completed").length;
  const failed = results.filter(r => r.status === "fail" || r.status === "failed").length;
  const na = results.filter(r => r.status === "na").length;
  const criticalTotal = results.filter(r => r.is_critical).length;
  const criticalFailed = results.filter(r => r.is_critical && (r.status === "fail" || r.status === "failed")).length;
  const validTotal = total - na;
  const rate = validTotal > 0 ? Math.round((passed / validTotal) * 100) : 0;

  return {
    total_items: total,
    passed_items: passed,
    failed_items: failed,
    na_items: na,
    compliance_rate: rate,
    critical_total: criticalTotal,
    critical_failed: criticalFailed,
    overall_passed: failed === 0 && criticalFailed === 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP/TEAM LEADER TYPES (for EnhancedStep1InfoDasar)
// ═══════════════════════════════════════════════════════════════════════════════

export interface Group {
  id: string;
  line_id: string;
  code: string;
  name?: string;
  sort_order: number;
  active: boolean;
  line?: Line;
}

export interface Line {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface GroupLeader {
  id: string;
  user_id: string;
  group_id: string;
  profiles?: {
    user_id: string;
    display_name: string | null;
    email: string | null;
  };
}

export interface GroupWithLeaders extends Group {
  group_leaders: GroupLeader[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Product {
  id: string;
  code: string;
  name: string;
  model: string | null;
  category: string | null;
  description: string | null;
  active: boolean;
}

export interface ProductWithLines extends Product {
  product_lines: Array<{ line_id: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATOR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Operator {
  id: string;
  full_name: string;
  employee_code: string | null;
  initials: string | null;
  avatar_color: string | null;
  role: string;
  active: boolean;
}

export interface OperatorSkill {
  operator_id: string;
  skill_id: string;
  level: number;
}

export interface Skill {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  active: boolean;
}