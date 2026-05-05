/**
 * DowntimeCategoriesTab — CRUD untuk Kategori Downtime (global, semua line)
 * - is_planned: true = Planned (istirahat, meeting, dll)
 *               false = Unplanned (breakdown, material habis, dll)
 */
import { useState, useMemo } from "react";
import { AdminSection, SortableDataTable, ColDef, RowActions, TableToolbar, Pager } from "@/components/admin/AdminSection";
import { useTableControls, SortOption } from "@/hooks/useTableControls";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useTable, useUpsert, useDeleteRow } from "@/hooks/useCrud";
import { supabase } from "@/integrations/supabase/client";
import { CsvButtons } from "@/components/admin/CsvButtons";
import { toBool, toInt } from "@/lib/csv-utils";

interface RefItem { id: string; name: string; sort_order: number; active: boolean; }

// ─── Types ────────────────────────────────────────────────────────────────────

interface DowntimeCategory {
  id: string;
  code: string;
  name: string;
  category: string | null;
  description: string | null;
  is_planned: boolean;
  active: boolean;
  sort_order: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────


/** Generate next auto code: DT-001, DT-002, … */
function nextDtCode(existing: DowntimeCategory[]): string {
  const nums = existing
    .map(c => c.code)
    .filter(c => /^DT-\d+$/.test(c))
    .map(c => parseInt(c.slice(3), 10));
  const max = nums.length ? Math.max(...nums) : 0;
  return `DT-${String(max + 1).padStart(3, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const emptyForm = (): Partial<DowntimeCategory> => ({
  code: "", name: "", category: "", description: "", is_planned: false, active: true, sort_order: 10,
});


const DT_SORT: SortOption<DowntimeCategory>[] = [
  { label: "Urutan ↑", fn: (a, b) => a.sort_order - b.sort_order },
  { label: "Urutan ↓", fn: (a, b) => b.sort_order - a.sort_order },
  { label: "Nama A→Z", fn: (a, b) => a.name.localeCompare(b.name) },
  { label: "Kode A→Z", fn: (a, b) => a.code.localeCompare(b.code) },
];

const DT_COLS: ColDef[] = [
  { label: "Urut",     sortAsc: 0, sortDesc: 1, className: "w-14" },
  { label: "Kode",     sortAsc: 3, filterKey: "code" },
  { label: "Nama",     sortAsc: 2, filterKey: "name" },
  { label: "Kategori", className: "w-28" },
  { label: "Tipe",     className: "w-28" },
  { label: "Status",   className: "w-20" },
  { label: "",         className: "w-[80px]" },
];
const DT_SEARCH: (keyof DowntimeCategory)[] = ["code", "name", "category", "description"];

export function DowntimeCategoriesTab() {
  const { data: categories = [], isLoading } = useTable<DowntimeCategory>("downtime_categories", {
    orderBy: "sort_order", ascending: true,
  });
  const { data: dtClasses = [] } = useTable<RefItem>("ref_downtime_classes", { orderBy: "sort_order", ascending: true });
  const upsert = useUpsert("downtime_categories");
  const del    = useDeleteRow("downtime_categories");

  const [open, setOpen]             = useState(false);
  const [form, setForm]             = useState<Partial<DowntimeCategory>>(emptyForm());
  const [filterType, setFilterType] = useState<"all" | "planned" | "unplanned">("all");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearErr = (f: string) => setErrors(e => { const n = { ...e }; delete n[f]; return n; });
  const errCls   = (f: string) => errors[f] ? "border-destructive focus-visible:ring-destructive" : "";

  const domainFiltered = useMemo(() =>
    filterType === "all" ? categories
    : filterType === "planned" ? categories.filter(c => c.is_planned)
    : categories.filter(c => !c.is_planned),
  [categories, filterType]);
  const tc = useTableControls(domainFiltered, DT_SEARCH, DT_SORT);

  const startAdd  = () => {
    setForm({ ...emptyForm(), code: nextDtCode(categories), sort_order: (categories.length + 1) * 10 });
    setErrors({});
    setOpen(true);
  };
  const startEdit = (c: DowntimeCategory) => { setForm(c); setErrors({}); setOpen(true); };

  const handleSubmit = async () => {
    const newErr: Record<string, string> = {};
    if (!form.name?.trim()) newErr.name = "Nama Kategori wajib diisi";
    if (Object.keys(newErr).length > 0) { setErrors(newErr); return; }
    await upsert.mutateAsync(form);
    setOpen(false);
  };

  const plannedCount   = categories.filter(c => c.is_planned).length;
  const unplannedCount = categories.filter(c => !c.is_planned).length;

  const importDowntime = async (rows: Record<string, string>[]) => {
    const toInsert = rows
      .filter(r => r.code?.trim() && r.name?.trim())
      .map((r, i) => ({
        code:        r.code.trim().toUpperCase(),
        name:        r.name.trim(),
        category:    r.category?.trim() || null,
        description: r.description?.trim() || null,
        is_planned:  toBool(r.is_planned, false),
        sort_order:  toInt(r.sort_order) ?? (i + 1) * 10,
        active:      toBool(r.active),
      }));
    if (!toInsert.length) return { imported: 0, errors: ["Tidak ada baris valid (code & name wajib)"] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("downtime_categories") as any)
      .upsert(toInsert, { onConflict: "code" }).select();
    if (error) throw new Error(error.message);
    return { imported: (data ?? []).length, errors: [] as string[] };
  };

  return (
    <>
      <AdminSection
        title="Kategori Downtime"
        description="Jenis penyebab downtime yang berlaku di semua Line Produksi. Dibagi menjadi Planned dan Unplanned."
        onAdd={startAdd}
        rightSlot={
          <CsvButtons
            templateFilename="template-downtime-categories.csv"
            templateHeaders={["code","name","category","description","is_planned","sort_order","active"]}
            templateSample={["DT-001","Ganti Tooling","Mesin","Penggantian alat potong rutin","false",10,"true"]}
            onImport={importDowntime}
          />
        }
      >
        {/* Filter bar */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {([
            ["all",       "Semua",     categories.length],
            ["unplanned", "🚨 Unplanned", unplannedCount],
            ["planned",   "📅 Planned",   plannedCount],
          ] as ["all" | "planned" | "unplanned", string, number][]).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition-colors ${
                filterType === key
                  ? key === "unplanned"
                    ? "bg-red-600 text-white border-red-600"
                    : key === "planned"
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
              <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-mono">{count}</span>
            </button>
          ))}
        </div>

        <TableToolbar
          search={tc.search} onSearch={tc.setSearch}
          total={tc.total} filteredCount={tc.filteredCount}
          activeFilterCount={tc.activeFilterCount} onClearColFilters={tc.clearColFilters}
        />
        {isLoading ? (
          <div className="text-sm text-muted-foreground p-4">Memuat…</div>
        ) : (
          <>
          <SortableDataTable cols={DT_COLS} sortIdx={tc.sortIdx} onSort={tc.setSortIdx} colFilters={tc.colFilters} onColFilter={tc.setColFilter}>
            {tc.paged.map(c => (
              <tr key={c.id} className="border-b hover:bg-surface-2">
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{c.sort_order}</td>
                <td className="px-3 py-2 font-mono text-xs font-semibold">{c.code}</td>
                <td className="px-3 py-2 font-medium text-sm">
                  {c.name}
                  {c.description && (
                    <p className="text-[11px] text-muted-foreground font-normal truncate max-w-[220px]">{c.description}</p>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{c.category || "—"}</td>
                <td className="px-3 py-2">
                  <span className={c.is_planned ? "chip chip-warning" : "chip chip-danger"}>
                    {c.is_planned ? "📅 Planned" : "🚨 Unplanned"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={c.active ? "chip chip-success" : "chip chip-warning"}>
                    {c.active ? "Aktif" : "Non-aktif"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <RowActions>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost"
                      onClick={() => confirm(`Hapus kategori downtime "${c.name}"?`) && del.mutate(c.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </RowActions>
                </td>
              </tr>
            ))}
            {tc.paged.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                  {tc.search ? "Tidak ada hasil" : "Belum ada kategori downtime terdaftar"}
                </td>
              </tr>
            )}
          </SortableDataTable>
          <Pager page={tc.page} totalPages={tc.totalPages} onChange={tc.setPage} filteredCount={tc.filteredCount} total={tc.total} pageSize={tc.pageSize} onPageSizeChange={tc.setPageSize} />
          </>
        )}
      </AdminSection>

      <FormModal
        open={open}
        onOpenChange={setOpen}
        size="xl"
        title={form.id ? "Edit Kategori Downtime" : "Tambah Kategori Downtime"}
        onSubmit={handleSubmit}
        busy={upsert.isPending}
      >
        {/* Row 1: Kode (auto, readonly) + Nama */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Kode *</Label>
            <Input
              value={form.code ?? ""}
              readOnly
              className="bg-slate-100 text-muted-foreground cursor-not-allowed font-mono"
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Nama Kategori <span className="text-destructive">*</span></Label>
            <Input
              value={form.name ?? ""}
              placeholder="Contoh: Machine Breakdown, Material Shortage, Changeover"
              className={errCls("name")}
              onChange={e => { clearErr("name"); setForm(f => ({ ...f, name: e.target.value })); }}
            />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
          </div>
        </div>

        {/* Row 2: Kategori 4M+E dropdown + Urutan + Aktif */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Kategori / Grup (5M+E)</Label>
            <Input
              list="dt-classes-list"
              value={form.category ?? ""}
              placeholder="Pilih atau ketik klasifikasi…"
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            />
            <datalist id="dt-classes-list">
              {dtClasses.filter(c => c.active).map(c => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label>Urutan Tampil</Label>
            <Input
              type="number" min={1}
              value={form.sort_order ?? 10}
              onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 10 }))}
                  />
          </div>
          <div className="flex items-end justify-between pb-0.5">
            <Label>Aktif</Label>
            <Switch
              checked={form.active ?? true}
              onCheckedChange={v => setForm(f => ({ ...f, active: v }))}
            />
          </div>
        </div>

        {/* Row 3: Planned flag + Deskripsi */}
        <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
          <div>
            <Label className="m-0">Planned Downtime</Label>
            <p className="text-[11px] text-muted-foreground">Centang jika ini downtime terencana (istirahat, meeting, changeover, dll)</p>
          </div>
          <Switch
            checked={form.is_planned ?? false}
            onCheckedChange={v => setForm(f => ({ ...f, is_planned: v }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Deskripsi <span className="text-muted-foreground font-normal">(opsional)</span></Label>
          <Input
            value={form.description ?? ""}
            placeholder="Keterangan tambahan…"
            onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))}
          />
        </div>
      </FormModal>
    </>
  );
}
