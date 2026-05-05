/** Data-fetching hooks for the Traceability page */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TraceRun, TraceHourly, TraceNg, TraceDowntime } from "./types";

export function useSearchWO(term: string) {
  return useQuery<TraceRun[]>({
    queryKey: ["trace-wo", term],
    enabled: term.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_runs")
        .select(`
          id, work_order, status, started_at, ended_at,
          target_qty, hourly_target, notes,
          lines(code, name),
          products(code, name),
          shifts(name, start_time, end_time)
        `)
        .ilike("work_order", `%${term.trim()}%`)
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as TraceRun[];
    },
  });
}

export function useTraceHourly(runId: string | null) {
  return useQuery<TraceHourly[]>({
    queryKey: ["trace-hourly", runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hourly_outputs")
        .select("hour_index, hour_label, actual_qty, ng_qty, downtime_minutes, is_break, note")
        .eq("shift_run_id", runId!)
        .order("hour_index");
      if (error) throw error;
      return (data ?? []) as TraceHourly[];
    },
  });
}

export function useTraceNg(runId: string | null) {
  return useQuery<TraceNg[]>({
    queryKey: ["trace-ng", runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ng_entries")
        .select(`
          id, qty, disposition, description, found_at,
          defect_types(code, name, category),
          processes!ng_entries_process_id_fkey(code, name)
        `)
        .eq("shift_run_id", runId!)
        .order("found_at");
      if (error) throw error;
      return (data ?? []) as TraceNg[];
    },
  });
}

export function useTraceDowntime(runId: string | null) {
  return useQuery<TraceDowntime[]>({
    queryKey: ["trace-dt", runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downtime_entries")
        .select(`
          id, kind, duration_minutes, started_at, ended_at,
          root_cause, action_taken,
          downtime_categories(code, name, category, is_planned)
        `)
        .eq("shift_run_id", runId!)
        .order("started_at");
      if (error) throw error;
      return (data ?? []) as TraceDowntime[];
    },
  });
}
