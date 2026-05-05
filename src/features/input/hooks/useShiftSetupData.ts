/**
 * Domain data hooks for the Shift Setup feature.
 * Pure server-state queries — no local UI state.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FALLBACK_CHECK_GROUPS } from "../types";
import { toast } from "sonner";

// ─── Error handling helper ────────────────────────────────────────────────────

interface QueryError {
  message: string;
  code?: string;
  details?: string;
}

function handleQueryError(error: unknown, context: string): QueryError {
  const err = error as { message?: string; code?: string; details?: string };
  const queryError: QueryError = {
    message: err.message || `Failed to load ${context}`,
    code: err.code,
    details: err.details
  };
  
  // Show user-friendly error toast
  toast.error(`Error loading ${context}`, {
    description: queryError.message
  });
  
  return queryError;
}

// ─── Master data ──────────────────────────────────────────────────────────────

export function useLines() {
  return useQuery({
    queryKey: ["lines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lines")
        .select("id, code, name, active")
        .eq("active", true)
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, code, name, model")
        .eq("active", true)
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllShifts() {
  return useQuery({
    queryKey: ["shifts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .order("start_time");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Leader-scoped data ───────────────────────────────────────────────────────

export function useLeaderGroups(userId?: string) {
  return useQuery({
    queryKey: ["leader_groups", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data: basicData, error: basicError } = await (supabase.from("group_leaders" as any) as any)
        .select("id, group_id")
        .eq("user_id", userId);
      
      if (basicError) {
        handleQueryError(basicError, "leader groups");
        throw basicError;
      }
      
      if (!basicData || basicData.length === 0) return [];

      const groupIds = basicData.map((gl: any) => gl.group_id).filter(Boolean);
      if (groupIds.length === 0) return basicData;

      const { data: groupsData, error: groupsError } = await (supabase.from("groups" as any) as any)
        .select("id, code, line_id")
        .in("id", groupIds);
      
      if (groupsError) {
        handleQueryError(groupsError, "group details");
        throw groupsError;
      }

      return basicData.map((gl: any) => ({
        ...gl,
        groups: groupsData?.find((g: any) => g.id === gl.group_id) ?? null,
      }));
    },
    enabled: !!userId,
  });
}

// ─── Line-scoped data ─────────────────────────────────────────────────────────

export function useLineProducts(lineId?: string) {
  return useQuery({
    queryKey: ["line_products", lineId],
    queryFn: async () => {
      if (!lineId) return [];
      
      const { data, error } = await (supabase.from("product_lines" as any) as any)
        .select("product_id, products(id, code, name, model)")
        .eq("line_id", lineId);
      
      if (error) {
        handleQueryError(error, "line products");
        throw error;
      }
      
      return (data ?? []).map((lp: any) => ({
        id: lp.product_id,
        ...(lp.products as any),
      }));
    },
    enabled: !!lineId,
  });
}

export function useLineOperators(lineId?: string) {
  return useQuery({
    queryKey: ["line_operators", lineId],
    queryFn: async () => {
      if (!lineId) return [];
      
      const { data, error } = await (supabase.from("operator_line_assignments" as any) as any)
        .select("operator_id, operators(id, full_name, initials, employee_code, avatar_color, position)")
        .eq("line_id", lineId);
      
      if (error) {
        handleQueryError(error, "line operators");
        throw error;
      }
      
      return data ?? [];
    },
    enabled: !!lineId,
  });
}

export function useLineGroups(lineId?: string) {
  return useQuery({
    queryKey: ["line_groups", lineId],
    queryFn: async () => {
      if (!lineId) return [];
      
      const { data, error } = await (supabase.from("groups" as any) as any)
        .select("id, code, line_id")
        .eq("line_id", lineId)
        .eq("active", true)
        .order("sort_order");
      
      if (error) {
        handleQueryError(error, "line groups");
        throw error;
      }
      
      return data ?? [];
    },
    enabled: !!lineId,
  });
}

// ─── Group-scoped data ────────────────────────────────────────────────────────

export function useGroupPOS(groupId?: string) {
  return useQuery({
    queryKey: ["group_pos", groupId],
    queryFn: async () => {
      if (!groupId) return { groupId: null, groupCode: "", posData: [] };
      
      const { data: group, error: groupError } = await (supabase.from("groups" as any) as any)
        .select("id, code")
        .eq("id", groupId)
        .single();
      
      if (groupError) {
        handleQueryError(groupError, "group details");
        throw groupError;
      }

      const { data: posData, error: posError } = await (supabase.from("group_process_assignments" as any) as any)
        .select(`
          process_id,
          processes(id, code, name)
        `)
        .eq("group_id", groupId);
      
      if (posError) {
        handleQueryError(posError, "group process assignments");
        throw posError;
      }

      // Get the line_id from the group
      const { data: groupDetail } = await (supabase.from("groups" as any) as any)
        .select("line_id")
        .eq("id", groupId)
        .single();

      // Fetch operator assignments - first try process-level, then fall back to line-level
      let opAssignments: any[] = [];
      
      // Try process-level assignments first
      const { data: processOpAssignments, error: procOpError } = await (supabase.from("operator_process_assignments" as any) as any)
        .select(`
          operator_id,
          process_id,
          operators(id, full_name, initials, employee_code, avatar_color, position)
        `)
        .in("process_id", (posData ?? []).map((p: any) => p.process_id));
      
      if (!procOpError && processOpAssignments) {
        opAssignments = processOpAssignments;
      } else {
        if (procOpError) {
          handleQueryError(procOpError, "operator process assignments");
        }
        
        // Fall back to line-level operators if process-level fails or returns empty
        if (groupDetail?.line_id) {
          const { data: lineOpAssignments, error: lineOpError } = await (supabase.from("operator_line_assignments" as any) as any)
            .select(`
              operator_id,
              operators(id, full_name, initials, employee_code, avatar_color, position)
            `)
            .eq("line_id", groupDetail.line_id);
          
          if (lineOpError) {
            handleQueryError(lineOpError, "line operator assignments");
          } else if (lineOpAssignments) {
            // Map line-level operators to all processes in the group
            opAssignments = (posData ?? []).flatMap((pos: any) =>
              (lineOpAssignments ?? []).map((op: any) => ({
                ...op,
                process_id: pos.process_id,
              }))
            );
          }
        }
      }

      // Transform data to match expected structure with default_assignments
      const transformedPosData = (posData ?? []).map((pos: any) => ({
        ...pos,
        default_assignments: opAssignments.filter((op: any) => op.process_id === pos.process_id),
      }));

      return { groupId, groupCode: (group as any).code, posData: transformedPosData };
    },
    enabled: !!groupId,
  });
}

// ─── Line checklist items ─────────────────────────────────────────────────────

export function useLineCheckItems(_lineId?: string) {
  const { data } = useQuery({
    queryKey: ["line_check_items", _lineId],
    queryFn: async () => FALLBACK_CHECK_GROUPS,
  });
  return data ?? FALLBACK_CHECK_GROUPS;
}
