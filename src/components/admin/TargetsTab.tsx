import { useState, useMemo } from "react";
import { AdminSection, SortableDataTable, ColDef, RowActions, TableToolbar, Pager } from "@/components/admin/AdminSection";
import { useTableControls, SortOption } from "@/hooks/useTableControls";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useTable, useUpsert, useDeleteRow } from "@/hooks/useCrud";
import { supabase } from "@/integrations/supabase/client";
import { CsvButtons } from "@/components/admin/CsvButtons";
import { toBool, toInt, toFloat } from "@/lib/csv-utils";

interface Target {
  id: string; line_id: string; product_id: string; shift_id: string;
  man_power: number; target_qty: number; hourly_target: number | null;
  cycle_time_seconds: number | null;
  effective_from: string;
}
interface Line { id: string; code: string; name: string; }
interface Product { id: string; code: string; name: string; }
interface Shift {
  id: string; code: string; name: string;
  start_time: string; end_time: string; break_minutes: number;
}

/** Hitung jam kerja efektif dari definisi shift (dikurangi break). */
function shiftEffectiveHours(s: Shift): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let diff = toMin(s.end_time) - toMin(s.start_time);
  if (diff <= 0) diff += 24 * 60; // overnight shift
  return Math.max((diff - (s.break_minutes ?? 60)) / 60, 1);
}

/** Hitung hourly_target dari target_qty dan data shift saat ini. */
function calcHourly(targetQty: number, shift: Shift): number {
  return Math.max(1, Math.round(targetQty / shiftEffectiveHours(shift)));
}

function effectiveHoursLabel(shift: Shift): string {
  return shiftEffectiveHours(shift).toFixed(1);
}

const TARGET_SORT: SortOption<Target>[] = [
  { label: "Terbaru",  fn: (a, b) => b.effective_from.localeCompare(a.effective_from) },
  { label: "Terlama",  fn: (a, b) => a.effective_from.localeCompare(b.effective_from) },
];

const TARGET_COLS: ColDef[] = [
  { label: "Berlaku",     sortAsc: 0, sortDesc: 1 },
  { label: "Lini",        className: "w-24" },
  { label: "Produk" },
  { label: "Shift",       className: "w-24" },
  { label: "Operator",    className: "w-20" },
  { label: "Target",      className: "w-20" },
  { label: "Per Jam *",   className: "w-20" },
  { label: "Per Org/Jam", className: "w-24" },
  { label: "Cycle Time",  className: "w-24" },
  { label: "",            className: "w-[80px]" },
];

export function TargetsTab() {
  const { data = [] } = useTable<Target>("production_targets", { orderBy: "effective_from", ascending: false });
  const { data: lines = [] } = useTable<Line>("lines", { orderBy: "code", ascending: true });
  const { data: products = [] } = useTable<Product>("products", { orderBy: "code", ascending: true });
  const { data: shifts = [] } = useTable<Shift>("shifts", { orderBy: "start_time", ascending: true });
  const upsert = useUpsert("production_targets");
  const del = useDeleteRow("production_targets");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Target>>({
    line_id: "", product_id: "", shift_id: "", man_power: 5,
    target_qty: 1200, hourly_target: 150,
    cycle_time_seconds: null,
    effective_from: new Date().toISOString().slice(0, 10),
  });

  const startAdd = () => {
    const sh = shifts[0];
    const tq = 1200;
    setForm({
      line_id: lines[0]?.id,
      product_id: products[0]?.id,
      shift_id: sh?.id,
      man_power: 5,
      target_qty: tq,
      hourly_target: sh ? calcHourly(tq, sh) : 150,
      cycle_time_seconds: null,
      effective_from: new Date().toISOString().slice(0, 10),
    });
    setOpen(true);
  };

  const startEdit = (t: Target) => {
    const sh = shifts.find(s => s.id === t.shift_id);
    setForm({
      ...t,
      // Saat edit dibuka, recalc hourly dari shift saat ini agar langsung sinkron
      hourly_target: sh ? calcHourly(t.target_qty, sh) : t.hourly_target,
    });
    setOpen(true);
  };

  const targetSearch = useMemo<Array<keyof Target | ((row: Target) => string)>>(() => [
    "effective_from",
    row => lines.find(l => l.id === row.line_id)?.code ?? "",
    row => products.find(p => p.id === row.product_id)?.code ?? "",
  ], [lines, products]);

  const tc = useTableControls(data, targetSearch, TARGET_SORT);

  /**
   * Setiap kali salah satu dari tiga nilai berubah (man_power, target_qty, shift_id),
   * hourly_target dihitung ulang otomatis dari shift saat ini.
   */
  const updateForm = (patch: Partial<Target>) => {
    setForm(prev => {
      const next = { ...prev, ...patch };
      const sh = shifts.find(s => s.id === next.shift_id);
      if (sh && next.target_qty) {
        next.hourly_target = calcHourly(next.target_qty, sh);
      }
      return next;
    });
  };

  // ── Nilai turunan untuk info panel ────────────────────────────────────
  const activeShift = shifts.find(s => s.id === form.shift_id);
  const effectiveHours = activeShift ? shiftEffectiveHours(activeShift) : null;

  const importTargets = async (rows: Record<string, string>[]) => {
    const lineMap    = new Map(lines.map(l    => [l.code.toUpperCase(),    l.id]));
    const productMap = new Map(products.map(p => [p.code.toUpperCase(),    p.id]));
    const shiftMap   = new Map(shifts.map(s   => [s.code.toUpperCase(),    s.id]));
    const errors: string[] = [];
    const toInsert = rows
      .filter(r => r.line_code?.trim() && r.product_code?.trim() && r.shift_code?.trim())
      .map(r => {
        const lid = lineMap.get(r.line_code.trim().toUpperCase());
        const pid = productMap.get(r.product_code.trim().toUpperCase());
        const sid = shiftMap.get(r.shift_code.trim().toUpperCase());
        if (!lid) errors.push(`line_code "${r.line_code}" tidak ditemukan`);
        if (!pid) errors.push(`product_code "${r.product_code}" tidak ditemukan`);
        if (!sid) errors.push(`shift_code "${r.shift_code}" tidak ditemukan`);
        if (!lid || !pid || !sid) return null;
        const mp = toInt(r.man_power) ?? 1;
        const tq = toInt(r.target_qty) ?? 0;
        const sh = shifts.find(s => s.id === sid);
        return { line_id: lid, product_id: pid, shift_id: sid, man_power: mp, target_qty: tq, hourly_target: sh ? calcHourly(tq, sh) : null, cycle_time_seconds: toFloat(r.cycle_time_seconds), effective_from: r.effective_from?.trim() || new Date().toISOString().slice(0, 10) };
      })
      .filter(Boolean) as Record<string, unknown>[];
    if (!toInsert.length) return { imported: 0, errors: errors.length ? errors : ["Tidak ada baris valid"] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("production_targets") as any)
      .upsert(toInsert, { onConflict: "line_id,product_id,shift_id,man_power,effective_from" }).select();
    if (error) throw new Error(error.message);
    return { imported: (data ?? []).length, errors };
  };

  const _toBool = toBool; // suppress unused import warning
  void _toBool;

  return (
    <>
      <AdminSection
        title="Target Produksi"
        description="Target per lini × produk × shift × jumlah operator"
        onAdd={startAdd}
        rightSlot={
          <CsvButtons
            templateFilename="template-targets.csv"
            templateHeaders={["line_code","product_code","shift_code","man_power","target_qty","cycle_time_seconds","effective_from"]}
            templateSample={["LINE-A","PRD-001","S1",5,1200,120,"2026-01-01"]}
            onImport={importTargets}
          />
        }
      >
        <TableToolbar
          search={tc.search} onSearch={tc.setSearch}
          total={tc.total} filteredCount={tc.filteredCount}
          activeFilterCount={tc.activeFilterCount} onClearColFilters={tc.clearColFilters}
        />
        <SortableDataTable cols={TARGET_COLS} sortIdx={tc.sortIdx} onSort={tc.setSortIdx} colFilters={tc.colFilters} onColFilter={tc.setColFilter}>
          {tc.paged.map(t => {
            const sh = shifts.find(s => s.id === t.shift_id);
            // Per Jam selalu dihitung dari data shift aktual (bukan nilai DB lama)
            const perJam = sh ? calcHourly(t.target_qty, sh) : t.hourly_target;
            const pph = (perJam && t.man_power > 0)
              ? Math.round(perJam / t.man_power) : null;
            const ctMax = t.cycle_time_seconds && t.cycle_time_seconds > 0
              ? Math.floor(3600 / t.cycle_time_seconds) : null;
            return (
              <tr key={t.id} className="border-b hover:bg-surface-2">
                <td className="px-3 py-2 font-mono text-xs">{t.effective_from}</td>
                <td className="px-3 py-2">{lines.find(l => l.id === t.line_id)?.code ?? "—"}</td>
                <td className="px-3 py-2">{products.find(p => p.id === t.product_id)?.code ?? "—"}</td>
                <td className="px-3 py-2 text-xs">
                  <div>{sh?.code ?? "—"}</div>
                  {sh && (
                    <div className="text-muted-foreground font-mono">
                      {sh.start_time}–{sh.end_time} ({effectiveHoursLabel(sh)} jam)
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-center">{t.man_power}</td>
                <td className="px-3 py-2 font-mono">{t.target_qty.toLocaleString()}</td>
                <td className="px-3 py-2 font-mono">{perJam ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground text-xs">
                  {pph != null ? `${pph}` : "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {t.cycle_time_seconds ? (
                    <div>
                      <span className="font-mono font-semibold">{t.cycle_time_seconds}s</span>
                      {ctMax && (
                        <span className="text-muted-foreground ml-1 text-[11px]">
                          (max {ctMax}/jam)
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <RowActions>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost"
                      onClick={() => confirm("Hapus target?") && del.mutate(t.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </RowActions>
                </td>
              </tr>
            );
          })}
          {tc.paged.length === 0 && (
            <tr>
              <td colSpan={10} className="text-center py-6 text-muted-foreground text-sm">
                {tc.search ? "Tidak ada hasil" : "Belum ada target"}
              </td>
            </tr>
          )}
        </SortableDataTable>
        <Pager page={tc.page} totalPages={tc.totalPages} onChange={tc.setPage} filteredCount={tc.filteredCount} total={tc.total} pageSize={tc.pageSize} onPageSizeChange={tc.setPageSize} />
        <p className="text-[11px] text-muted-foreground mt-2 px-1">
          * Kolom "Per Jam" dihitung langsung dari jam efektif shift saat ini — otomatis sinkron bila data shift diubah.
        </p>
      </AdminSection>

      <FormModal open={open} onOpenChange={setOpen} size="xl"
        title={form.id ? "Edit Target" : "Tambah Target"}
        onSubmit={async () => { await upsert.mutateAsync(form); setOpen(false); }}
        busy={upsert.isPending}>

        {/* Row 1: Lini / Produk / Shift */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Lini</Label>
            <select className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={form.line_id ?? ""}
              onChange={e => updateForm({ line_id: e.target.value })}>
              {lines.map(l => <option key={l.id} value={l.id}>{l.code} — {l.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Produk</Label>
            <select className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={form.product_id ?? ""}
              onChange={e => updateForm({ product_id: e.target.value })}>
              {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Shift</Label>
            <select className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={form.shift_id ?? ""}
              onChange={e => updateForm({ shift_id: e.target.value })}>
              {shifts.map(s => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name} ({effectiveHoursLabel(s)} jam efektif)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Man Power / Target Total / Cycle Time / Berlaku Sejak */}
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label>Jumlah Operator</Label>
            <Input type="number" min={1}
              value={form.man_power ?? 1}
              onChange={e => updateForm({ man_power: Math.max(1, parseInt(e.target.value) || 1) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Target Total (pcs)</Label>
            <Input type="number" min={1}
              value={form.target_qty ?? 0}
              onChange={e => updateForm({ target_qty: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="space-y-1.5">
            <Label>Cycle Time (detik)</Label>
            <Input type="number" min={0.1} step={0.1} placeholder="—"
              value={form.cycle_time_seconds ?? ""}
              onChange={e => setForm(f => ({
                ...f,
                cycle_time_seconds: e.target.value === "" ? null : Math.max(0.1, parseFloat(e.target.value) || 0.1),
              }))} />
            <p className="text-[11px] text-muted-foreground">Waktu 1 unit per operator</p>
          </div>
          <div className="space-y-1.5">
            <Label>Berlaku Sejak</Label>
            <DateInput
              value={form.effective_from ?? ""}
              onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} />
          </div>
        </div>

        {/* Row 3: Hasil kalkulasi (read-only info) + override manual */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Target / Jam (dihitung otomatis)</Label>
            <Input type="number" min={1}
              value={form.hourly_target ?? 0}
              onChange={e => setForm(f => ({ ...f, hourly_target: parseInt(e.target.value) || 0 }))} />
            <p className="text-[11px] text-muted-foreground">
              Bisa diubah manual jika perlu override
            </p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2.5 text-xs space-y-1 self-start mt-6">
            <div className="font-semibold text-foreground/80">Ringkasan kalkulasi</div>
            {activeShift && effectiveHours !== null ? (
              <>
                <div>
                  Jam efektif:{" "}
                  <span className="font-mono font-semibold">{effectiveHours.toFixed(1)} jam</span>
                  <span className="text-muted-foreground">
                    {" "}({activeShift.start_time}–{activeShift.end_time}, break {activeShift.break_minutes} mnt)
                  </span>
                </div>
                <div>
                  Target / Jam:{" "}
                  <span className="fontmono font-semibold">{form.hourly_target ?? 0} pcs/jam</span>
                </div>
                {form.cycle_time_seconds && form.cycle_time_seconds > 0 && effectiveHours !== null && (
                  <div>
                    CT-based max:{" "}
                    <span className="font-mono font-semibold">
                      {Math.floor(3600 / form.cycle_time_seconds)} pcs/jam
                    </span>
                    <span className="text-muted-foreground ml-1 text-[10px]">(per operator, teoritis)</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted-foreground/60 italic">Pilih shift untuk melihat ringkasan.</div>
            )}
          </div>
        </div>

      </FormModal>
    </>
  );
}
