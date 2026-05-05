/**
 * useAutonomousChecks — Hook for Autonomous Maintenance check sheet
 * Handles loading items, results, submitting checks, and compliance calculation
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CheckStatus = "pending" | "in_progress" | "pass" | "fail" | "na";

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

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Load check items for a line */
export function useAutonomousCheckItems(lineId: string) {
  return useQuery({
    queryKey: ["autonomous-check-items", lineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autonomous_check_items")
        .select("*")
        .eq("line_id", lineId)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!lineId,
  });
}

/** Load existing results for a shift run */
export function useAutonomousCheckResults(shiftRunId: string, checkSession: "first" | "last" = "first") {
  return useQuery({
    queryKey: ["autonomous-check-results", shiftRunId, checkSession],
    queryFn: async () => {
      // Check for summary first
      const { data: summary } = await supabase
        .from("autonomous_check_summary")
        .select("*")
        .eq("shift_run_id", shiftRunId)
        .eq("check_session", checkSession)
        .single();

      // Get individual results
      const { data: results, error } = await supabase
        .from("autonomous_check_results")
        .select(`
          *,
          autonomous_check_items (
            code, name, category, standard, method, is_critical, 
            item_type, target_value, tolerance, measurement_unit, 
            max_time_seconds, sort_order
          )
        `)
        .eq("shift_run_id", shiftRunId)
        .order("sort_order", { referencedTable: "autonomous_check_items", ascending: true });
      
      if (error) throw error;
      return { results: results || [], summary };
    },
    enabled: !!shiftRunId,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/** Submit a single check item result */
export function useSubmitCheckResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      shift_run_id: string;
      check_item_id: string;
      status: CheckStatus;
      measured_value?: number;
      note?: string;
      photo_urls?: string[];
      checked_by_operator_id: string;
      check_session: "first" | "last";
    }) => {
      const { shift_run_id, check_item_id, status, measured_value, note, photo_urls, checked_by_operator_id } = params;

      // Upsert result
      const { data, error } = await supabase
        .from("autonomous_check_results")
        .upsert(
          {
            shift_run_id,
            check_item_id,
            status,
            measured_value,
            note,
            photo_urls,
            checked_by_operator_id,
            started_at: status === "in_progress" ? new Date().toISOString() : undefined,
            completed_at: ["pass", "fail", "na"].includes(status) ? new Date().toISOString() : undefined,
          },
          { onConflict: "shift_run_id,check_item_id,checked_by_operator_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ["autonomous-check-results", params.shift_run_id] });
    },
  });
}

/** Submit all checks at once */
export function useSubmitAllChecks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      shift_run_id: string;
      items: Array<{ check_item_id: string; status: CheckStatus; measured_value?: number }>;
      checked_by_operator_id: string;
      check_session: "first" | "last";
    }) => {
      const { shift_run_id, items, checked_by_operator_id, check_session } = params;
      const now = new Date().toISOString();

      // Batch insert/update all results
      const results = items.map(item => ({
        shift_run_id,
        check_item_id: item.check_item_id,
        status: item.status,
        measured_value: item.measured_value,
        checked_by_operator_id,
        completed_at: ["pass", "fail", "na"].includes(item.status) ? now : undefined,
      }));

      const { data, error } = await supabase
        .from("autonomous_check_results")
        .upsert(results, { onConflict: "shift_run_id,check_item_id,checked_by_operator_id" })
        .select();

      if (error) throw error;

      // Calculate and save summary
      const passed = items.filter(i => i.status === "pass").length;
      const failed = items.filter(i => i.status === "fail").length;
      const na = items.filter(i => i.status === "na").length;
      const total = items.length;
      const rate = total > 0 ? Math.round((passed / (total - na)) * 100) : 0;

      await supabase.from("autonomous_check_summary").upsert({
        shift_run_id,
        check_session,
        total_items: total,
        passed_items: passed,
        failed_items: failed,
        na_items: na,
        compliance_rate: rate,
        overall_passed: failed === 0,
        completed_at: now,
        created_by_operator_id: checked_by_operator_id,
      }, { onConflict: "shift_run_id,check_session" });

      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ["autonomous-check-results", params.shift_run_id] });
      toast.success("Semua check berhasil disimpan!");
    },
    onError: (error) => {
      toast.error(`Gagal menyimpan: ${error.message}`);
    },
  });
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/** Calculate compliance from results */
export function calculateCompliance(results: CheckItemResult[]): ComplianceSummary {
  const total = results.length;
  const passed = results.filter(r => r.status === "pass").length;
  const failed = results.filter(r => r.status === "fail").length;
  const na = results.filter(r => r.status === "na").length;
  const criticalTotal = results.filter(r => r.is_critical).length;
  const criticalFailed = results.filter(r => r.is_critical && r.status === "fail").length;
  const rate = total > 0 ? Math.round((passed / (total - na)) * 100) : 0;

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

/** Get check item status with time tracking */
export function useCheckItemTimer() {
  const getElapsedSeconds = (startedAt?: string) => {
    if (!startedAt) return 0;
    return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  };

  return { getElapsedSeconds };
}