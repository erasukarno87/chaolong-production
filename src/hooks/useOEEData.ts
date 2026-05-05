/**
 * useOEEData — Hook for OEE (Overall Equipment Effectiveness) calculations
 * 
 * Fetches production data and calculates:
 * - OEE = Availability × Performance × Quality
 * - Availability = Run Time / Planned Production Time
 * - Performance = (Actual Output / Target Output) × 100
 * - Quality = (Actual Output - NG) / Actual Output
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Line {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface ShiftRun {
  id: string;
  line_id: string;
  date: string;
  shift: string;
  status: "draft" | "active" | "completed" | "locked";
  actual_output: number;
  target_output: number;
  notes?: string;
  leader_signature_url?: string | null;
  completed_at?: string | null;
  created_by_operator_id?: string;
}

export interface ShiftRunOutput {
  shift_run_id: string;
  quantity: number;
}

export interface NGEntry {
  shift_run_id: string;
  quantity: number;
}

export interface DowntimeEntry {
  shift_run_id: string;
  duration_minutes: number;
}

export interface OEERecord {
  // Source data
  shift_run_id: string;
  date: string;
  line_id: string;
  line_code: string;
  shift: string;
  status: string;
  
  // Raw values
  actual_output: number;
  target_output: number;
  total_ng: number;
  total_downtime_minutes: number;
  planned_time_minutes: number;
  
  // OEE Components (0-100)
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  
  // Flags
  is_locked: boolean;
  has_signature: boolean;
}

export interface OEESummary {
  avgOEE: number;
  avgAvailability: number;
  avgPerformance: number;
  avgQuality: number;
  totalRecords: number;
  totalOutput: number;
  totalNG: number;
  minOEE: number;
  maxOEE: number;
}

export interface UseOEEDataOptions {
  /** Filter by line ID */
  lineId?: string | null;
  /** Start date (ISO string) */
  startDate?: string | null;
  /** End date (ISO string) */
  endDate?: string | null;
  /** Specific shift run IDs to include */
  shiftRunIds?: string[] | null;
  /** Filter by status */
  status?: ShiftRun["status"] | "all";
  /** Group by period for aggregation */
  groupBy?: "day" | "shift" | "week" | "none";
}

// ─── OEE Calculation Helper ─────────────────────────────────────────────────────

function calculateOEE(
  actualOutput: number,
  targetOutput: number,
  totalNG: number,
  totalDowntimeMinutes: number,
  plannedTimeMinutes: number = 480
): { availability: number; performance: number; quality: number; oee: number } {
  // Availability: actual running time / planned time
  const runTime = plannedTimeMinutes - totalDowntimeMinutes;
  const availability = plannedTimeMinutes > 0 ? (runTime / plannedTimeMinutes) * 100 : 0;

  // Performance: actual output vs target (capped at 100%)
  const performance = targetOutput > 0 
    ? Math.min((actualOutput / targetOutput) * 100, 100) 
    : 0;

  // Quality: good output / total output
  const goodOutput = actualOutput - totalNG;
  const quality = actualOutput > 0 ? (goodOutput / actualOutput) * 100 : 0;

  // OEE: product of all three factors
  const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;

  return {
    availability: Math.round(availability * 10) / 10,
    performance: Math.round(performance * 10) / 10,
    quality: Math.round(quality * 10) / 10,
    oee: Math.round(oee * 10) / 10,
  };
}

// ─── Main Hook ─────────────────────────────────────────────────────────────────

export function useOEEData(options: UseOEEDataOptions = {}) {
  const { user } = useAuth();
  const { lineId, startDate, endDate, shiftRunIds, status = "all", groupBy = "none" } = options;

  return useQuery<OEERecord[]>({
    queryKey: ["oee-data", lineId, startDate, endDate, shiftRunIds, status, groupBy],
    queryFn: async (): Promise<OEERecord[]> => {
      // 1. Fetch shift runs with line info
      let shiftRunsQuery = supabase
        .from("shift_runs")
        .select(`
          id,
          line_id,
          date,
          shift,
          status,
          actual_output,
          target_output,
          notes,
          leader_signature_url,
          completed_at,
          created_by_operator_id,
          lines (id, code, name, active)
        `)
        .order("date", { ascending: false })
        .order("shift");

      if (lineId) {
        shiftRunsQuery = shiftRunsQuery.eq("line_id", lineId);
      }

      if (status !== "all") {
        shiftRunsQuery = shiftRunsQuery.eq("status", status);
      }

      if (startDate) {
        shiftRunsQuery = shiftRunsQuery.gte("date", startDate);
      }

      if (endDate) {
        shiftRunsQuery = shiftRunsQuery.lte("date", endDate);
      }

      if (shiftRunIds && shiftRunIds.length > 0) {
        shiftRunsQuery = shiftRunsQuery.in("id", shiftRunIds);
      }

      const { data: shiftRuns, error: srError } = await shiftRunsQuery;
      if (srError) throw srError;
      if (!shiftRuns || shiftRuns.length === 0) return [];

      const shiftRunIds = shiftRuns.map(sr => sr.id);

      // 2. Fetch outputs for these shift runs
      const { data: outputs } = await supabase
        .from("shift_run_outputs")
        .select("shift_run_id, quantity")
        .in("shift_run_id", shiftRunIds);

      // 3. Fetch NG entries
      const { data: ngEntries } = await supabase
        .from("shift_run_ng_entries")
        .select("shift_run_id, quantity")
        .in("shift_run_id", shiftRunIds);

      // 4. Fetch downtime entries
      const { data: downtimeEntries } = await supabase
        .from("shift_run_downtimes")
        .select("shift_run_id, duration_minutes")
        .in("shift_run_id", shiftRunIds);

      // 5. Aggregate outputs/NG/downtime by shift_run_id
      const outputsBySR = new Map<string, number>();
      for (const o of outputs ?? []) {
        outputsBySR.set(o.shift_run_id, (outputsBySR.get(o.shift_run_id) ?? 0) + o.quantity);
      }

      const ngBySR = new Map<string, number>();
      for (const ng of ngEntries ?? []) {
        ngBySR.set(ng.shift_run_id, (ngBySR.get(ng.shift_run_id) ?? 0) + ng.quantity);
      }

      const downtimeBySR = new Map<string, number>();
      for (const dt of downtimeEntries ?? []) {
        downtimeBySR.set(dt.shift_run_id, (downtimeBySR.get(dt.shift_run_id) ?? 0) + dt.duration_minutes);
      }

      // 6. Build OEE records
      const oeeRecords: OEERecord[] = shiftRuns.map(sr => {
        const line = (sr.lines as unknown as Line | null);
        const actualOutput = outputsBySR.get(sr.id) ?? 0;
        const totalNG = ngBySR.get(sr.id) ?? 0;
        const totalDowntime = downtimeBySR.get(sr.id) ?? 0;

        const { availability, performance, quality, oee } = calculateOEE(
          actualOutput,
          sr.target_output,
          totalNG,
          totalDowntime
        );

        return {
          shift_run_id: sr.id,
          date: sr.date,
          line_id: sr.line_id,
          line_code: line?.code ?? "",
          shift: sr.shift,
          status: sr.status,
          actual_output: actualOutput,
          target_output: sr.target_output,
          total_ng: totalNG,
          total_downtime_minutes: totalDowntime,
          planned_time_minutes: 480, // Default 8-hour shift
          availability,
          performance,
          quality,
          oee,
          is_locked: sr.status === "locked",
          has_signature: !!sr.leader_signature_url,
        };
      });

      return oeeRecords;
    },
    enabled: !!user?.id,
    staleTime: 60_000, // 1 minute cache
  });
}

// ─── Helper Hooks ──────────────────────────────────────────────────────────────

/** Get OEE summary statistics */
export function useOEESummary(data: OEERecord[] | undefined): OEESummary {
  if (!data || data.length === 0) {
    return {
      avgOEE: 0,
      avgAvailability: 0,
      avgPerformance: 0,
      avgQuality: 0,
      totalRecords: 0,
      totalOutput: 0,
      totalNG: 0,
      minOEE: 0,
      maxOEE: 0,
    };
  }

  const n = data.length;
  const sum = data.reduce(
    (acc, r) => ({
      oee: acc.oee + r.oee,
      avail: acc.avail + r.availability,
      perf: acc.perf + r.performance,
      qual: acc.qual + r.quality,
      output: acc.output + r.actual_output,
      ng: acc.ng + r.total_ng,
    }),
    { oee: 0, avail: 0, perf: 0, qual: 0, output: 0, ng: 0 }
  );

  return {
    avgOEE: Math.round((sum.oee / n) * 10) / 10,
    avgAvailability: Math.round((sum.avail / n) * 10) / 10,
    avgPerformance: Math.round((sum.perf / n) * 10) / 10,
    avgQuality: Math.round((sum.qual / n) * 10) / 10,
    totalRecords: n,
    totalOutput: sum.output,
    totalNG: sum.ng,
    minOEE: Math.min(...data.map(r => r.oee)),
    maxOEE: Math.max(...data.map(r => r.oee)),
  };
}

/** Get lines for OEE filtering */
export function useOEELines() {
  return useQuery<Line[]>({
    queryKey: ["oee-lines"],
    queryFn: async (): Promise<Line[]> => {
      const { data, error } = await supabase
        .from("lines")
        .select("id, code, name, active")
        .eq("active", true)
        .order("code");

      if (error) throw error;
      return (data ?? []) as Line[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}