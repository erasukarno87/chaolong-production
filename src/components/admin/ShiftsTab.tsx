import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminSection, SortableDataTable, ColDef, RowActions, TableToolbar, Pager } from "@/components/admin/AdminSection";
import { useTableControls, SortOption } from "@/hooks/useTableControls";
import { CsvButtons } from "@/components/admin/CsvButtons";
import { toBool, toInt } from "@/lib/csv-utils";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { ShiftFormModal } from "./ShiftFormModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShiftBreak {
  id?: string; shift_id?: string; break_order: number;
  start_time: string; duration_minutes: number; label: string;
}
interface Shift {
  id: string; code: string; name: string;
  start_time: string; end_time: string; break_minutes: number;
  active: boolean; shift_breaks?: ShiftBreak[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMin(t: string): number {
  const [h, m] = (t ?? "00:00").split(":").map(Number);
  return h * 60 + m;
}
function shiftDurationMin(s: Pick<Shift, "start_time" | "end_time">): number {
  const diff = toMin(s.end_time) - toMin(s.start_time);
  return diff > 0 ? diff : diff + 24 * 60;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useShifts() {
  return useQuery<Shift[]>({
    queryKey: ["shifts-with-breaks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("*, shift_breaks(id, shift_id, break_order, start_time, duration_minutes, label)")
        .order("start_time");
      if (error) throw error;
      return (data ?? []) as Shift[];
    },
  });
}

// ─── Component ────────────────────────────────────────────────────────────────


const SHIFT_SORT: SortOption<Shift>[] = [
  { label: "Nama A→Z", fn: (a, b) => a.name.localeCompare(b.name) },
  { label: "Nama Z→A", fn: (a, b) => b.name.localeCompare(a.name) },
  { label: "Kode A→Z", fn: (a, b) => a.code.localeCompare(b.code) },
];

const SHIFT_COLS: ColDef[] = [
  { label: "Kode",        sortAsc: 2, filterKey: "code" },
  { label: "Nama",        sortAsc: 0, sortDesc: 1, filterKey: "name" },
  { label: "Jam Kerja",   className: "w-28" },
  { label: "Istirahat",   className: "w-36" },
  { label: "Jam Efektif", className: "w-24" },
  { label: "Status",      className: "w-20" },
  { label: "",            className: "w-[80px]" },
];
const SHIFT_SEARCH: (keyof Shift)[] = ["code", "name"];

export function ShiftsTab() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useShifts();
  const tc = useTableControls(data, SHIFT_SEARCH, SHIFT_SORT);

  const [open, setOpen]         = useState(false);
  const [editShift, setEditShift] = useState<Shift | null>(null);

  const delMutation = useMutation({
    mutationFn: (id: string) => supabase.from("shifts").delete().eq("id", id).then(r => { if (r.error) throw r.error; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts-with-breaks"] }),
    onError:   (e: Error) => toast.error(e.message),
  });

  // ── Open form ────────────────────────────────────────────────────────────

  const openAdd  = () => { setEditShift(null); setOpen(true); };
  const openEdit = (s: Shift) => { setEditShift(s); setOpen(true); };

  // ── CSV Import ────────────────────────────────────────────────────────────
  const importShifts = async (rows: Record<string, string>[]) => {
    let imported = 0;
    const errors: string[] = [];
    for (const r of rows) {
      if (!r.code?.trim() || !r.name?.trim()) { errors.push("Baris dilewati: code/name kosong"); continue; }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: up, error: shiftErr } = await (supabase.from("shifts") as any)
          .upsert({
            code:       r.code.trim().toUpperCase(),
            name:       r.name.trim(),
            start_time: r.start_time?.trim() || "07:00",
            end_time:   r.end_time?.trim()   || "15:00",
            active:     toBool(r.active),
          }, { onConflict: "code" }).select("id").single();
        if (shiftErr) throw shiftErr;
        const shiftId = up.id;
        await supabase.from("shift_breaks").delete().eq("shift_id", shiftId);
        const brRows = [];
        for (let i = 1; i <= 3; i++) {
          const start = r[`break${i}_start`]?.trim();
          const dur   = toInt(r[`break${i}_minutes`]);
          if (start && dur) brRows.push({ shift_id: shiftId, break_order: i, start_time: start, duration_minutes: dur, label: r[`break${i}_label`]?.trim() || "Istirahat" });
        }
        if (brRows.length) { const { error: brErr } = await supabase.from("shift_breaks").insert(brRows); if (brErr) throw brErr; }
        imported++;
      } catch (e: unknown) { errors.push(`${r.code}: ${e instanceof Error ? e.message : String(e)}`); }
    }
    qc.invalidateQueries({ queryKey: ["shifts-with-breaks"] });
    qc.invalidateQueries({ queryKey: ["shifts"] });
    return { imported, errors };
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <AdminSection
        title="Konfigurasi Shift"
        description="Definisi shift kerja beserta jadwal istirahat (maksimal 3 sesi)"
        onAdd={openAdd}
        rightSlot={
          <CsvButtons
            templateFilename="template-shifts.csv"
            templateHeaders={["code","name","start_time","end_time","active","break1_start","break1_minutes","break1_label","break2_start","break2_minutes","break2_label"]}
            templateSample={["S1","Shift Pagi","07:00","15:00","true","10:00",15,"Snack","12:00",30,"Makan Siang"]}
            onImport={importShifts}
          />
        }
      >
        <TableToolbar
          search={tc.search} onSearch={tc.setSearch}
          total={tc.total} filteredCount={tc.filteredCount}
          activeFilterCount={tc.activeFilterCount} onClearColFilters={tc.clearColFilters}
        />
        {isLoading ? (
          <div className="text-sm text-muted-foreground p-4">Memuat…</div>
        ) : (
          <>
          <SortableDataTable cols={SHIFT_COLS} sortIdx={tc.sortIdx} onSort={tc.setSortIdx} colFilters={tc.colFilters} onColFilter={tc.setColFilter}>
            {tc.paged.map(s => {
              const brks   = (s.shift_breaks ?? []).sort((a, b) => a.break_order - b.break_order);
              const brkMin = brks.reduce((sum, b) => sum + b.duration_minutes, 0);
              const dur    = shiftDurationMin(s);
              const net    = Math.max(0, dur - brkMin);
              return (
                <tr key={s.id} className="border-b hover:bg-surface-2">
                  <td className="px-3 py-2 font-mono text-xs font-semibold">{s.code}</td>
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                    <span className="text-muted-foreground ml-1.5 text-[11px]">({dur} mnt)</span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {brks.length === 0 ? (
                      <span className="text-muted-foreground/60">—</span>
                    ) : (
                      <div className="space-y-0.5">
                        {brks.map(b => (
                          <div key={b.break_order} className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 shrink-0 text-amber-500" />
                            <span className="font-mono">{(b.start_time ?? "").slice(0, 5)}</span>
                            <span className="chip chip-warning text-[10px] py-0">{b.duration_minutes} mnt</span>
                            <span className="text-muted-foreground/70 text-[11px]">{b.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-green-700">
                    {(net / 60).toFixed(1)} jam
                  </td>
                  <td className="px-3 py-2">
                    <span className={s.active ? "chip chip-success" : "chip chip-warning"}>
                      {s.active ? "Aktif" : "Non-aktif"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <RowActions>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost"
                        onClick={() => confirm(`Hapus shift ${s.code}?`) && delMutation.mutate(s.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </RowActions>
                  </td>
                </tr>
              );
            })}
            {tc.paged.length === 0 && (
              <tr><td colSpan={7} className="text-center py-6 text-muted-foreground text-sm">{tc.search ? "Tidak ada hasil" : "Belum ada shift"}</td></tr>
            )}
          </SortableDataTable>
          <Pager page={tc.page} totalPages={tc.totalPages} onChange={tc.setPage} filteredCount={tc.filteredCount} total={tc.total} pageSize={tc.pageSize} onPageSizeChange={tc.setPageSize} />
          </>
        )}
      </AdminSection>

      <ShiftFormModal
        open={open}
        onOpenChange={setOpen}
        editShift={editShift}
      />
    </>
  );
}
