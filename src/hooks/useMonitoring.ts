/**
 * Hooks untuk Live Monitoring Dashboard.
 * Mengambil data dari Supabase dan menyediakan Realtime subscription.
 */
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/features/input/constants";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ─── Active shift run for monitoring ─────────────────────────────────────────

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

export async function fetchMonitoringRun() {
  const { data, error } = await supabase
    .from("shift_runs")
    .select(`
      id, line_id, target_qty, hourly_target, status, started_at,
      lines(code, name),
      products(code, name, model),
      shifts(name, start_time, end_time)
    `)
    .in("status", ["running", "setup"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as MonitoringRun | null;
}

export function useMonitoringRun() {
  return useQuery<MonitoringRun | null>({
    queryKey: ["monitoring-run"],
    queryFn: fetchMonitoringRun,
  });
}

// ─── Hourly Outputs ───────────────────────────────────────────────────────────

export interface MonHourlyOutput {
  id: string;
  hour_index: number;
  hour_label: string;
  actual_qty: number;
  ng_qty: number;
  downtime_minutes: number;
  note: string | null;
}

export async function fetchMonitoringHourly(runId: string) {
  const { data, error } = await supabase
    .from("hourly_outputs")
    .select("id, hour_index, hour_label, actual_qty, ng_qty, downtime_minutes, note")
    .eq("shift_run_id", runId)
    .order("hour_index");
  if (error) throw error;
  return (data ?? []) as MonHourlyOutput[];
}

export function useMonitoringHourly(runId: string | undefined) {
  return useQuery<MonHourlyOutput[]>({
    queryKey: ["monitoring-hourly", runId],
    enabled: !!runId,
    queryFn: () => fetchMonitoringHourly(runId!),
  });
}

// ─── NG Entries (aggregated by defect type) ───────────────────────────────────

export interface MonNgAgg {
  defect_name: string;
  total_qty: number;
  pct: number;
}

export interface MonNgEntry {
  id: string;
  qty: number;
  hour_index: number;
  note: string | null;
  defect_types: { code: string; name: string } | null;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function fetchMonitoringNg(runId: string) {
  const { data, error } = await supabase
    .from("ng_entries")
    .select("qty, defect_types(name)")
    .eq("shift_run_id", runId);
  if (error) throw error;

  const rows = (data ?? []) as { qty: number; defect_types: { name: string } | null }[];
  const agg: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    const name = r.defect_types?.name ?? "Other";
    agg[name] = (agg[name] ?? 0) + r.qty;
    total += r.qty;
  }
  return Object.entries(agg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([defect_name, qty]) => ({
      defect_name,
      total_qty: qty,
      pct: total > 0 ? Math.round((qty / total) * 100) : 0,
    }));
}

export function useMonitoringNg(runId: string | undefined) {
  return useQuery<MonNgAgg[]>({
    queryKey: ["monitoring-ng", runId],
    enabled: !!runId,
    queryFn: () => fetchMonitoringNg(runId!),
  });
}

/**
 * Paginated NG entries for detailed view
 */
export async function fetchMonitoringNgPaginated(
  runId: string,
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<PaginatedResult<MonNgEntry>> {
  const validPageSize = Math.min(pageSize, MAX_PAGE_SIZE);
  const from = (page - 1) * validPageSize;
  const to = from + validPageSize - 1;

  // Get total count
  const { count, error: countError } = await supabase
    .from("ng_entries")
    .select("*", { count: 'exact', head: true })
    .eq("shift_run_id", runId);

  if (countError) throw countError;

  // Get paginated data
  const { data, error } = await supabase
    .from("ng_entries")
    .select("id, qty, hour_index, note, defect_types(code, name)")
    .eq("shift_run_id", runId)
    .order("hour_index", { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: (data ?? []) as MonNgEntry[],
    total: count ?? 0,
    page,
    pageSize: validPageSize,
    totalPages: Math.ceil((count ?? 0) / validPageSize)
  };
}

export function useMonitoringNgPaginated(
  runId: string | undefined,
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
) {
  return useQuery<PaginatedResult<MonNgEntry>>({
    queryKey: ["monitoring-ng-paginated", runId, page, pageSize],
    enabled: !!runId,
    queryFn: () => fetchMonitoringNgPaginated(runId!, page, pageSize),
  });
}

// ─── Downtime Entries (aggregated) ───────────────────────────────────────────

export interface MonDtAgg {
  category_name: string;
  total_min: number;
  pct: number;
}

export async function fetchMonitoringDowntime(runId: string) {
  const { data, error } = await supabase
    .from("downtime_entries")
    .select("duration_minutes, downtime_categories(name)")
    .eq("shift_run_id", runId);
  if (error) throw error;

  const rows = (data ?? []) as { duration_minutes: number; downtime_categories: { name: string } | null }[];
  const agg: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    const name = r.downtime_categories?.name ?? "Lainnya";
    agg[name] = (agg[name] ?? 0) + r.duration_minutes;
    total += r.duration_minutes;
  }
  return Object.entries(agg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category_name, min]) => ({
      category_name,
      total_min: min,
      pct: total > 0 ? Math.round((min / total) * 100) : 0,
    }));
}

export function useMonitoringDowntime(runId: string | undefined) {
  return useQuery<MonDtAgg[]>({
    queryKey: ["monitoring-downtime", runId],
    enabled: !!runId,
    queryFn: () => fetchMonitoringDowntime(runId!),
  });
}

/**
 * Paginated downtime entries for detailed view
 */
export async function fetchMonitoringDowntimePaginated(
  runId: string,
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<PaginatedResult<MonDowntimeRaw>> {
  const validPageSize = Math.min(pageSize, MAX_PAGE_SIZE);
  const from = (page - 1) * validPageSize;
  const to = from + validPageSize - 1;

  // Get total count
  const { count, error: countError } = await supabase
    .from("downtime_entries")
    .select("*", { count: 'exact', head: true })
    .eq("shift_run_id", runId);

  if (countError) throw countError;

  // Get paginated data
  const { data, error } = await supabase
    .from("downtime_entries")
    .select(`
      id, kind, duration_minutes, started_at, ended_at,
      root_cause, action_taken,
      downtime_categories(code, name, is_planned)
    `)
    .eq("shift_run_id", runId)
    .order("started_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: (data ?? []) as MonDowntimeRaw[],
    total: count ?? 0,
    page,
    pageSize: validPageSize,
    totalPages: Math.ceil((count ?? 0) / validPageSize)
  };
}

export function useMonitoringDowntimePaginated(
  runId: string | undefined,
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
) {
  return useQuery<PaginatedResult<MonDowntimeRaw>>({
    queryKey: ["monitoring-downtime-paginated", runId, page, pageSize],
    enabled: !!runId,
    queryFn: () => fetchMonitoringDowntimePaginated(runId!, page, pageSize),
  });
}

// ─── Check Sheet Results ──────────────────────────────────────────────────────

export interface MonCheckResult {
  id: string;
  passed: boolean;
  checked_at: string;
  check_sheet_templates: { kind: string; label: string; sort_order: number } | null;
}

export async function fetchMonitoringCheckSheets(runId: string) {
  const { data, error } = await supabase
    .from("check_sheet_results")
    .select("id, passed, checked_at, check_sheet_templates(kind, label, sort_order)")
    .eq("shift_run_id", runId);
  if (error) throw error;
  return (data ?? []) as MonCheckResult[];
}

export function useMonitoringCheckSheets(runId: string | undefined) {
  return useQuery<MonCheckResult[]>({
    queryKey: ["monitoring-checksheets", runId],
    enabled: !!runId,
    queryFn: () => fetchMonitoringCheckSheets(runId!),
  });
}

// ─── Operator Skills ──────────────────────────────────────────────────────────

export interface MonSkillRow {
  operator_id: string;
  full_name: string;
  initials: string | null;
  join_date: string;
  assigned_line_ids: string[];
  skills: { process_name: string; level: number; wi_pass: boolean }[];
}

export async function fetchMonitoringSkills() {
  const { data, error } = await supabase
    .from("operator_skills")
    .select(`
      level, wi_pass,
      operators_public(id, full_name, initials, created_at, assigned_line_ids),
      skills(code, name, sort_order)
    `)
    .order("level", { ascending: false });
  if (error) throw error;

  const map = new Map<string, MonSkillRow>();
  for (const row of data ?? []) {
    const op = (row as any).operators_public;
    const skill = (row as any).skills;
    if (!op) continue;
    if (!map.has(op.id)) {
      map.set(op.id, {
        operator_id: op.id,
        full_name: op.full_name,
        initials: op.initials,
        join_date: op.created_at?.slice(0, 7) ?? "",
        assigned_line_ids: op.assigned_line_ids ?? [],
        skills: [],
      });
    }
    map.get(op.id)!.skills.push({
      process_name: skill?.name ?? "?",
      level: row.level,
      wi_pass: row.wi_pass,
    });
  }
  return Array.from(map.values());
}

export function useMonitoringSkills() {
  return useQuery<MonSkillRow[]>({
    queryKey: ["monitoring-skills"],
    queryFn: fetchMonitoringSkills,
  });
}

// ─── Downtime Entries — Raw (for SCW Log & 4M derivation) ────────────────────

export interface MonDowntimeRaw {
  id: string;
  kind: string;
  duration_minutes: number;
  started_at: string;
  ended_at: string | null;
  root_cause: string | null;
  action_taken: string | null;
  downtime_categories: { code: string; name: string; is_planned: boolean } | null;
}

export async function fetchMonitoringDowntimeRaw(runId: string) {
  const { data, error } = await supabase
    .from("downtime_entries")
    .select(`
      id, kind, duration_minutes, started_at, ended_at,
      root_cause, action_taken,
      downtime_categories(code, name, is_planned)
    `)
    .eq("shift_run_id", runId)
    .order("started_at");
  if (error) throw error;
  return (data ?? []) as MonDowntimeRaw[];
}

export function useMonitoringDowntimeRaw(runId: string | undefined) {
  return useQuery<MonDowntimeRaw[]>({
    queryKey: ["monitoring-downtime-raw", runId],
    enabled: !!runId,
    queryFn: () => fetchMonitoringDowntimeRaw(runId!),
  });
}

// ─── Realtime Subscription ────────────────────────────────────────────────────

type SubStatus = "connecting" | "live" | "error";

export function useMonitoringRealtime(runId: string | undefined): SubStatus {
  const [status, setStatus] = useState<SubStatus>("connecting");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (!runId) {
      setStatus("connecting");
      return;
    }

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["monitoring-hourly", runId] });
      qc.invalidateQueries({ queryKey: ["monitoring-ng", runId] });
      qc.invalidateQueries({ queryKey: ["monitoring-downtime", runId] });
      qc.invalidateQueries({ queryKey: ["monitoring-checksheets", runId] });
      qc.invalidateQueries({ queryKey: ["monitoring-run"] });
    };

    const channel = supabase
      .channel(`monitoring:${runId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "hourly_outputs",    filter: `shift_run_id=eq.${runId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "ng_entries",        filter: `shift_run_id=eq.${runId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "downtime_entries",  filter: `shift_run_id=eq.${runId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "check_sheet_results", filter: `shift_run_id=eq.${runId}` }, invalidate)
      .subscribe((s) => {
        if (s === "SUBSCRIBED")   setStatus("live");
        if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("error");
        if (s === "CLOSED")       setStatus("connecting");
      });

    channelRef.current = channel;
    setStatus("connecting");

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [runId, qc]);

  return status;
}
