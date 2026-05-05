/**
 * Hooks untuk Shift Run aktif dan data entri terkait.
 * Digunakan oleh Shift.tsx untuk membaca/menulis ke Supabase.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ShiftSetupData, NgEntryData, DowntimeData } from "@/components/modals/ShiftModals";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShiftRun {
  id: string;
  line_id: string;
  product_id: string;
  shift_id: string;
  leader_user_id: string | null;
  work_order: string | null;
  target_qty: number;
  hourly_target: number;
  status: "setup" | "running" | "completed" | "cancelled";
  started_at: string | null;
  notes: string | null;
  lines?: { code: string; name: string };
  products?: { code: string; name: string };
  shifts?: { name: string; start_time: string; end_time: string };
}

export interface HourlyOutput {
  id: string;
  shift_run_id: string;
  hour_index: number;
  hour_label: string;
  actual_qty: number;
  ng_qty: number;
  downtime_minutes: number;
  is_break: boolean;
  note: string | null;
}

export interface NgEntry {
  id: string;
  shift_run_id: string;
  qty: number;
  disposition: string;
  description: string | null;
  found_at: string;
  defect_types?: { name: string; category: string | null };
  processes?: { name: string; code: string } | null;
}

export interface DowntimeEntry {
  id: string;
  shift_run_id: string;
  kind: "planned" | "unplanned";
  duration_minutes: number;
  started_at: string;
  ended_at: string | null;
  root_cause: string | null;
  action_taken: string | null;
  downtime_categories?: { name: string; is_planned: boolean };
}

// ─── Active Shift Run ─────────────────────────────────────────────────────────

/** Fetch shift run paling baru yang masih aktif (status: running atau setup). */
export function useActiveShiftRun() {
  return useQuery<ShiftRun | null>({
    queryKey: ["active-shift-run"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_runs")
        .select(`
          id, line_id, product_id, shift_id, leader_user_id,
          work_order, target_qty, hourly_target, status, started_at, notes,
          lines(code, name),
          products(code, name),
          shifts(name, start_time, end_time)
        `)
        .in("status", ["setup", "running"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as ShiftRun | null);
    },
    refetchInterval: 30_000,
  });
}

// ─── Hourly Outputs ───────────────────────────────────────────────────────────

export function useHourlyOutputs(shiftRunId: string | undefined) {
  return useQuery<HourlyOutput[]>({
    queryKey: ["hourly-outputs", shiftRunId],
    enabled: !!shiftRunId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hourly_outputs")
        .select("*")
        .eq("shift_run_id", shiftRunId!)
        .order("hour_index");
      if (error) throw error;
      return (data ?? []) as HourlyOutput[];
    },
  });
}

export function useUpsertHourlyOutput(shiftRunId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<HourlyOutput, "id" | "shift_run_id"> & { id?: string }) => {
      const { id, ...rest } = payload;
      const base = { ...rest, shift_run_id: shiftRunId! };
      const fn = id
        ? supabase.from("hourly_outputs").update(rest).eq("id", id).select().single()
        : supabase.from("hourly_outputs").insert(base).select().single();
      const { data, error } = await fn;
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hourly-outputs", shiftRunId] });
      qc.invalidateQueries({ queryKey: ["active-shift-run"] });
      toast.success("Output tersimpan");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── NG Entries ───────────────────────────────────────────────────────────────

export function useNgEntries(shiftRunId: string | undefined) {
  return useQuery<NgEntry[]>({
    queryKey: ["ng-entries", shiftRunId],
    enabled: !!shiftRunId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ng_entries")
        .select(`
          id, shift_run_id, qty, disposition, description, found_at,
          defect_types(name, category),
          processes!ng_entries_process_id_fkey(name, code)
        `)
        .eq("shift_run_id", shiftRunId!)
        .order("found_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NgEntry[];
    },
  });
}

export function useCreateNgEntry(shiftRunId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: NgEntryData) => {
      const { data, error } = await supabase
        .from("ng_entries")
        .insert({
          shift_run_id: shiftRunId!,
          defect_type_id: payload.defect_type_id || null,
          process_id: payload.process_id || null,
          qty: payload.quantity,
          disposition: payload.disposition,
          description: payload.description || null,
          found_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ng-entries", shiftRunId] });
      toast.success("NG entry ditambahkan");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Downtime Entries ─────────────────────────────────────────────────────────

export function useDowntimeEntries(shiftRunId: string | undefined) {
  return useQuery<DowntimeEntry[]>({
    queryKey: ["downtime-entries", shiftRunId],
    enabled: !!shiftRunId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downtime_entries")
        .select(`
          id, shift_run_id, kind, duration_minutes, started_at, ended_at,
          root_cause, action_taken,
          downtime_categories(name, is_planned)
        `)
        .eq("shift_run_id", shiftRunId!)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DowntimeEntry[];
    },
  });
}

export function useCreateDowntimeEntry(shiftRunId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DowntimeData) => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("downtime_entries")
        .insert({
          shift_run_id: shiftRunId!,
          category_id: payload.category_id || null,
          kind: payload.kind,
          duration_minutes: payload.duration,
          started_at: `${today}T${payload.start_time}:00`,
          ended_at: `${today}T${payload.end_time}:00`,
          root_cause: payload.root_cause || null,
          action_taken: payload.action_taken || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["downtime-entries", shiftRunId] });
      toast.success("Downtime dicatat");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Create Shift Run ─────────────────────────────────────────────────────────

export function useCreateShiftRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ShiftSetupData) => {
      const { data, error } = await supabase
        .from("shift_runs")
        .insert({
          line_id: payload.line_id,
          shift_id: payload.shift_id,
          product_id: payload.product_id,
          work_order: payload.work_order_no || null,
          target_qty: payload.target_quantity,
          hourly_target: payload.hourly_target,
          leader_user_id: payload.leader_user_id || null,
          group_id: payload.group_id ?? null,
          status: "running",
          started_at: payload.actual_started_at ?? new Date().toISOString(),
          plan_start_at: payload.plan_start_at ?? null,
          plan_finish_at: payload.plan_finish_at ?? null,
          notes: payload.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-shift-run"] });
      toast.success("Shift run dimulai");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Submit EOSR ──────────────────────────────────────────────────────────────

export function useSubmitEosr(shiftRunId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      totalActual,
      totalNg,
      totalDowntime,
      oee,
      targetQty,
      notes,
      leaderName,
    }: {
      totalActual: number;
      totalNg: number;
      totalDowntime: number;
      oee: number;
      targetQty: number;
      notes?: string;
      leaderName?: string;
    }) => {
      if (!shiftRunId) throw new Error("Tidak ada shift run aktif");

      // PIN was already verified at operator unlock — no re-verification needed here.
      const achievementPct = targetQty > 0 ? (totalActual / targetQty) * 100 : 0;

      // 1. Insert EOSR report
      const { error: eosrError } = await supabase.from("eosr_reports").insert({
        shift_run_id: shiftRunId,
        total_actual: totalActual,
        total_ng: totalNg,
        total_downtime_min: totalDowntime,
        achievement_pct: Math.round(achievementPct * 100) / 100,
        oee_pct: oee,
        notes: notes || null,
        signed_by_name: leaderName || null,
        signed_at: new Date().toISOString(),
      });
      if (eosrError) throw eosrError;

      // 3. Lock shift run
      const { error: updateError } = await supabase
        .from("shift_runs")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", shiftRunId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-shift-run"] });
      qc.invalidateQueries({ queryKey: ["hourly-outputs", shiftRunId] });
      qc.invalidateQueries({ queryKey: ["ng-entries", shiftRunId] });
      qc.invalidateQueries({ queryKey: ["downtime-entries", shiftRunId] });
      toast.success("EOSR submitted. Shift run di-lock.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
