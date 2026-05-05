import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AnyRow = Record<string, unknown>;

/** Generic list hook for any table with an `order by` column. */
export function useTable<T extends AnyRow = AnyRow>(
  table: string,
  opts: { orderBy?: string; ascending?: boolean; select?: string } = {},
) {
  const { orderBy = "created_at", ascending = false, select = "*" } = opts;
  return useQuery<T[]>({
    queryKey: ["table", table, orderBy, ascending, select],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from(table) as any)
        .select(select).order(orderBy, { ascending });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

/** Invalidasi semua query yang terkait tabel ini (prefix match + predicate fallback). */
function invalidateTable(qc: ReturnType<typeof useQueryClient>, table: string) {
  // 1. Prefix match: menangkap useTable() yang keynya ["table", table, ...]
  qc.invalidateQueries({ queryKey: ["table", table], exact: false });
  // 2. Predicate fallback: menangkap custom query keys yang mengandung nama tabel
  qc.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey.some((k) => typeof k === "string" && k.replace(/_/g, "-") === table.replace(/_/g, "-")),
  });
}

export function useUpsert(table: string, invalidateKey?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AnyRow & { id?: string }) => {
      const { id, ...rest } = payload;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fn = id ? (supabase.from(table) as any).update(rest).eq("id", id).select().single()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : (supabase.from(table) as any).insert(rest).select().single();
      const { data, error } = await fn;
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateTable(qc, invalidateKey ?? table);
      toast.success("Tersimpan");
    },
    onError: (e: Error) => toast.error(e.message ?? "Gagal menyimpan"),
  });
}

export function useDeleteRow(table: string, invalidateKey?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(table) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTable(qc, invalidateKey ?? table);
      toast.success("Dihapus");
    },
    onError: (e: Error) => toast.error(e.message ?? "Gagal menghapus"),
  });
}
