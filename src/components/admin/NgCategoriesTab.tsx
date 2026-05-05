/**
 * NgCategoriesTab — CRUD untuk Kategori NG (Defect Types)
 * - Setiap kategori bisa bersifat global (product_id = null) atau khusus produk tertentu
 * - Filter tampilan per produk / semua
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface DefectType {
  id: string;
  code: string;
  name: string;
  category: string | null;
  product_id: string | null;
  active: boolean;
  sort_order: number;
}

interface Product {
  id: string;
  code: string;
  name: string;
}

interface RefItem { id: string; name: string; sort_order: number; active: boolean; }

// ─── Hooks ────────────────────────────────────────────────────────────────────
// Pakai useTable agar queryKey selaras dengan useUpsert/useDeleteRow invalidation

// ─── Component ────────────────────────────────────────────────────────────────

/** Generate next auto code: NG-001, NG-002, … */
function nextNgCode(existing: DefectType[]): string {
  const nums = existing
    .map(d => d.code)
    .filter(c => /^NG-\d+$/.test(c))
    .map(c => parseInt(c.slice(3), 10));
  const max = nums.length ? Math.max(...nums) : 0;
  return `NG-${String(max + 1).padStart(3, "0")}`;
}

const emptyForm = (): Partial<DefectType> => ({
  code: "", name: "", category: "", product_id: null, active: true, sort_order: 10,
});


const NG_SORT: SortOption<DefectType>[] = [
  { label: "Urutan ↑",  fn: (a, b) => a.sort_order - b.sort_order },
  { label: "Urutan ↓",  fn: (a, b) => b.sort_order - a.sort_order },
  { label: "Nama A→Z",  fn: (a, b) => a.name.localeCompare(b.name) },
  { label: "Kode A→Z",  fn: (a, b) => a.code.localeCompare(b.code) },
];

const NG_COLS: ColDef[] = [
  { label: "Urut",     sortAsc: 0, sortDesc: 1, className: "w-14" },
  { label: "Kode",     sortAsc: 3, filterKey: "code" },
  { label: "Nama",     sortAsc: 2, filterKey: "name" },
  { label: "Kategori", className: "w-28" },
  { label: "Produk",   className: "w-32" },
  { label: "Status",   className: "w-20" },
  { label: "",         className: "w-[80px]" },
];
const NG_SEARCH: (keyof DefectType)[] = ["code", "name", "category"];

export function NgCategoriesTab() {
  // useTable → queryKey = ["table", "defect_types", ...] — selaras dengan useUpsert/useDeleteRow
  const { data: defects = [], isLoading } = useTable<DefectType>("defect_types", { orderBy: "sort_order", ascending: true });
  const { data: products = [] }           = useTable<Product>("products", { orderBy: "code", ascending: true });
  const { data: ngClasses = [] }          = useTable<RefItem>("ref_ng_classes", { orderBy: "sort_order", ascending: true });
  const upsert = useUpsert("defect_types");
  const del    = useDeleteRow("defect_types");

  const [open, setOpen]             = useState(false);
  const [form, setForm]             = useState<Partial<DefectType>>(emptyForm());
  const [filterProd, setFilterProd] = useState<string>("all");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearErr = (f: string) => setErrors(e => { const n = { ...e }; delete n[f]; return n; });
  const errCls   = (f: string) => errors[f] ? "border-destructive focus-visible:ring-destructive" : "";

  const productMap = new Map(products.map(p => [p.id, p]));

  const domainFiltered = useMemo(() =>
    filterProd === "all" ? defects
    : filterProd === "global" ? defects.filter(d => d.product_id === null)
    : defects.filter(d => d.product_id === filterProd),
  [defects, filterProd]);
  const tc = useTableControls(domainFiltered, NG_SEARCH, NG_SORT);

  const startAdd  = () => {
    setForm({
      ...emptyForm(),
      code: nextNgCode(defects),
      sort_order: (defects.length + 1) * 10,
    });
    setErrors({});
    setOpen(true);
  };
  const startEdit = (d: DefectType) => { setForm(d); setErrors({}); setOpen(true); };

  const handleSubmit = async () => {
    const newErr: Record<string, string> = {};
    if (!form.name?.trim()) newErr.name = "Nama Defect wajib diisi";
    if (Object.keys(newErr).length > 0) { setErrors(newErr); return; }
    await upsert.mutateAsync(form);
    setOpen(false);
  };

  // Group count per product for the filter chips
  const countByProduct = defects.reduce<Record<string, number>>((acc, d) => {
    const key = d.product_id ?? "__global__";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const importDefects = async (rows: Record<string, string>[]) => {
    const prodMap = new Map(products.map(p => [p.code.toUpperCase(), p.id]));
    const errors: string[] = [];
    const toInsert = rows
      .filter(r => r.code?.trim() && r.name?.trim())
      .map((r, i) => {
        const pc = r.product_code?.trim().toUpperCase();
        const pid = pc ? (prodMap.get(pc) ?? null) : null;
        if (pc && !pid) errors.push(`${r.code}: product_code "${r.product_code}" tidak ditemukan`);
        return { code: r.code.trim().toUpperCase(), name: r.name.trim(), category: r.category?.trim() || null, product_id: pid, sort_order: toInt(r.sort_order) ?? (i + 1) * 10, active: toBool(r.active) };
      });
    if (!toInsert.length) return { imported: 0, errors: ["Tidak ada baris valid"] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("defect_types") as any)
      .upsert(toInsert, { onConflict: "code" }).select();
    if (error) throw new Error(error.message);
    return { imported: (data ?? []).length, errors };
  };

  return (
    <>
      <AdminSection
        title="Kategori NG / Defect"
        description="Jenis cacat produk per kategori. Bisa bersifat global (semua produk) atau khusus produk tertentu."
        onAdd={startAdd}
        rightSlot={
          <CsvButtons
            templateFilename="template-ng-categories.csv"
            templateHeaders={["code","name","category","product_code","sort_order","active"]}
            templateSample={["NG-001","Solder Lepas","Soldering","PRD-001",10,"true"]}
            onImport={importDefects}
          />
        }
      >
        {/* Filter bar */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {([
            ["all",    "Semua",  defects.length],
            ["global", "Global", countByProduct["__global__"] ?? 0],
          ] as [string, string, number][]).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setFilterProd(key)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition-colors ${
                filterProd === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
              <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-mono">{count}</span>
            </button>
          ))}
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => setFilterProd(p.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition-colors ${
                filterProd === p.id
                  ? "bg-violet-600 text-white border-violet-600"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {p.code}
              {countByProduct[p.id] !== undefined && (
                <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-mono">{countByProduct[p.id]}</span>
              )}
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
          <SortableDataTable cols={NG_COLS} sortIdx={tc.sortIdx} onSort={tc.setSortIdx} colFilters={tc.colFilters} onColFilter={tc.setColFilter}>
            {tc.paged.map(d => (
              <tr key={d.id} className="border-b hover:bg-surface-2">
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{d.sort_order}</td>
                <td className="px-3 py-2 font-mono text-xs font-semibold">{d.code}</td>
                <td className="px-3 py-2 font-medium text-sm">{d.name}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{d.category || "—"}</td>
                <td className="px-3 py-2">
                  {d.product_id
                    ? <span className="chip chip-info">{productMap.get(d.product_id)?.code ?? "—"}</span>
                    : <span className="chip">Global</span>
                  }
                </td>
                <td className="px-3 py-2">
                  <span className={d.active ? "chip chip-success" : "chip chip-warning"}>
                    {d.active ? "Aktif" : "Non-aktif"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <RowActions>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(d)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost"
                      onClick={() => confirm(`Hapus kategori NG "${d.name}"?`) && del.mutate(d.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </RowActions>
                </td>
              </tr>
            ))}
            {tc.paged.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                  {tc.search ? "Tidak ada hasil" : "Belum ada kategori NG untuk filter ini"}
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
        title={form.id ? "Edit Kategori NG" : "Tambah Kategori NG"}
        onSubmit={handleSubmit}
        busy={upsert.isPending}
      >
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Kode</Label>
            <Input
              value={form.code ?? ""}
              readOnly
              className="bg-slate-100 text-muted-foreground cursor-not-allowed font-mono"
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Nama Defect <span className="text-destructive">*</span></Label>
            <Input
              value={form.name ?? ""}
              placeholder="Contoh: Scratch Surface, Dimensi Out-of-Spec"
              className={errCls("name")}
              onChange={e => { clearErr("name"); setForm(f => ({ ...f, name: e.target.value })); }}
            />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
          </div>
        </div>

        {/* Row 2: Kategori + Produk */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Kategori / Klasifikasi</Label>
            <Input
              list="ng-classes-list"
              value={form.category ?? ""}
              placeholder="Pilih atau ketik klasifikasi…"
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            />
            <datalist id="ng-classes-list">
              {ngClasses.filter(c => c.active).map(c => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label>Produk (opsional)</Label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={form.product_id ?? ""}
              onChange={e => setForm(f => ({ ...f, product_id: e.target.value || null }))}
            >
              <option value="">— Global (semua produk) —</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">Kosongkan = berlaku untuk semua produk</p>
          </div>
        </div>

        {/* Row 3: Urutan + Aktif */}
        <div className="grid grid-cols-2 gap-3">
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
      </FormModal>
    </>
  );
}
