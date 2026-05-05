/** Data-fetching hooks used by the Shift modals. */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useModalLines() {
  return useQuery({
    queryKey: ["lines-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lines").select("id, code, name").eq("active", true).order("code");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useModalShifts() {
  return useQuery({
    queryKey: ["shifts-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shifts").select("id, code, name, start_time, end_time").eq("active", true).order("code");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useModalProducts() {
  return useQuery({
    queryKey: ["products-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, code, name, model").eq("active", true).order("code");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOperatorsRoster() {
  return useQuery({
    queryKey: ["operators-roster"],
    queryFn: async () => {
      const { data, error } = await supabase.from("operators_public").select("id, full_name, employee_code, role").eq("active", true).order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSubProcesses() {
  return useQuery({
    queryKey: ["processes-for-ng"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processes")
        .select("id, name, code, line_id, lines(name)")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; code: string; line_id: string; lines: { name: string } | null }[];
    },
  });
}

export function useDefectTypes(productId?: string) {
  return useQuery({
    queryKey: ["defect-types-active", productId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("defect_types")
        .select("id, code, name, category, product_id")
        .eq("active", true)
        .order("sort_order");
      if (productId) {
        q = q.or(`product_id.is.null,product_id.eq.${productId}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as { id: string; code: string; name: string; category: string | null; product_id: string | null }[];
    },
    staleTime: 2 * 60_000,
  });
}

export function useDowntimeCategories() {
  return useQuery({
    queryKey: ["downtime-categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("downtime_categories").select("id, code, name, is_planned").eq("active", true).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}
