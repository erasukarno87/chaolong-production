import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminSection, SortableDataTable, ColDef, RowActions, TableToolbar, Pager } from "@/components/admin/AdminSection";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useTable, useUpsert, useDeleteRow } from "@/hooks/useCrud";
import { CsvButtons } from "@/components/admin/CsvButtons";
import { toBool } from "@/lib/csv-utils";
import { useTableControls, SortOption } from "@/hooks/useTableControls";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string; code: string; name: string; model: string | null;
  category: string | null; description: string | null; active: boolean;
}

interface Line { id: string; code: string; name: string; }
interface RefItem { id: string; name: string; sort_order: number; active: boolean; }

// ─── Database Response Types ─────────────────────────────────────────────────

interface ProductLineDB {
  product_id: string;
  line_id: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryChip(cat: string | null): string {
  if (!cat) return "chip";
  const map: Record<string, string> = {
    "CCU":                    "chip chip-info",
    "Fuel Sender":            "chip chip-success",
    "Speedometer Digital":    "bg-violet-100 text-violet-700 chip",
    "Speedometer Mechanical": "bg-purple-100 text-purple-700 chip",
    "Winker Lamp":            "chip chip-warning",
    "ECU":                    "bg-cyan-100 text-cyan-700 chip",
    "CDI":                    "bg-teal-100 text-teal-700 chip",
  };
  return map[cat] ?? "chip";
}

// ─── Sort + ColDef ────────────────────────────────────────────────────────────

const PROD_SORT: SortOption<Product>[] = [
  { label: "Kode A→Z",     fn: (a, b) => a.code.localeCompare(b.code) },        // 0
  { label: "Kode Z→A",     fn: (a, b) => b.code.localeCompare(a.code) },        // 1
  { label: "Nama A→Z",     fn: (a, b) => a.name.localeCompare(b.name) },        // 2
  { label: "Kategori A→Z", fn: (a, b) => (a.category ?? "").localeCompare(b.category ?? "") }, // 3
];
const PROD_SEARCH: (keyof Product)[] = ["code", "name", "model", "category"];

const PROD_COLS: ColDef[] = [
  { label: "Kode",          sortAsc: 0, sortDesc: 1, filterKey: "code",     className: "w-28" },
  { label: "Kategori",      sortAsc: 3,               filterKey: "category", className: "w-32" },
  { label: "Nama",          sortAsc: 2,               filterKey: "name" },
  { label: "Model",                                   filterKey: "model",    className: "w-24" },
  { label: "Lini Produksi",                                                  className: "w-52" },
  { label: "Status",                                                         className: "w-20" },
  { label: "",                                                               className: "w-[80px]" },
];

const empty: Partial<Product> = { code:"", name:"", model:"", category:"", description:"", active:true };

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductsTab() {
  const qc = useQueryClient();

  // Master data
  const { data = [], isLoading } = useTable<Product>("products", { orderBy:"code", ascending:true });
  const { data: refCats = [] }   = useTable<RefItem>("ref_product_categories", { orderBy:"sort_order", ascending:true });
  const { data: lines = [] }     = useTable<Line>("lines", { orderBy:"code", ascending:true });

  // product_lines junction table
  const { data: productLines = [] } = useQuery({
    queryKey: ["product-lines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_lines")
        .select("product_id, line_id")
        .returns<ProductLineDB[]>();
      if (error) throw error;
      return (data ?? []) as ProductLineDB[];
    },
  });

  // product_id → line_id[]
  const productLineMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const row of productLines) {
      if (!m.has(row.product_id)) m.set(row.product_id, []);
      m.get(row.product_id)!.push(row.line_id);
    }
    return m;
  }, [productLines]);

  // line_id → Line (for display)
  const lineById = useMemo(() => new Map(lines.map(l => [l.id, l])), [lines]);

  const upsert = useUpsert("products");
  const del    = useDeleteRow("products");

  // Form state
  const [open, setOpen]               = useState(false);
  const [form, setForm]               = useState<Partial<Product>>(empty);
  const [formLineIds, setFormLineIds] = useState<string[]>([]);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [saveBusy, setSaveBusy]       = useState(false);

  const clearErr = (f: string) => setErrors(e => { const n = { ...e }; delete n[f]; return n; });
  const errCls   = (f: string) => errors[f] ? "border-destructive focus-visible:ring-destructive" : "";

  const tc = useTableControls(data, PROD_SEARCH, PROD_SORT);

  // Kategori dari ref table + existing (backward compat)
  const allCategories = Array.from(new Set([
    ...refCats.filter(r => r.active).map(r => r.name),
    ...data.map(p => p.category).filter(Boolean) as string[],
  ])).sort();

  // ── Open form ────────────────────────────────────────────────────────────────
  function openAdd() {
    setForm(empty); setFormLineIds([]); setErrors({}); setOpen(true);
  }
  function openEdit(p: Product) {
    setForm(p); setFormLineIds(productLineMap.get(p.id) ?? []); setErrors({}); setOpen(true);
  }

  function toggleLine(lineId: string) {
    setFormLineIds(prev => prev.includes(lineId) ? prev.filter(id => id !== lineId) : [...prev, lineId]);
  }

  // ── Save product + product_lines ─────────────────────────────────────────────
  async function handleSave() {
    const newErr: Record<string, string> = {};
    if (!form.code?.trim()) newErr.code = "Kode wajib diisi";
    if (!form.name?.trim()) newErr.name = "Nama Produk wajib diisi";
    if (Object.keys(newErr).length > 0) { setErrors(newErr); return; }

    setSaveBusy(true);
    try {
      const result = await upsert.mutateAsync({
        ...form,
        code:        form.code!.trim().toUpperCase(),
        category:    form.category?.trim() || null,
        description: form.description?.trim() || null,
      });
      const productId: string | undefined = (result as { id?: string })?.id ?? form.id;

      if (productId) {
        const currentLineIds = productLineMap.get(productId) ?? [];
        const nextLineIds = Array.from(new Set(formLineIds));
        const toInsert = nextLineIds.filter(lineId => !currentLineIds.includes(lineId));
        const toDelete = currentLineIds.filter(lineId => !nextLineIds.includes(lineId));

        if (toInsert.length > 0) {
          const { error } = await supabase
            .from("product_lines")
            .insert(toInsert.map(lineId => ({ product_id: productId, line_id: lineId })));
          if (error) throw new Error(error.message);
        }
        if (toDelete.length > 0) {
          const { error } = await supabase
            .from("product_lines")
            .delete()
            .eq("product_id", productId)
            .in("line_id", toDelete);
          if (error) throw new Error(error.message);
        }
        qc.invalidateQueries({ queryKey: ["product-lines"] });
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan produk");
    } finally {
      setSaveBusy(false);
    }
  }

  // ── CSV import ────────────────────────────────────────────────────────────────
  const importProducts = async (rows: Record<string, string>[]) => {
    const toInsert = rows
      .filter(r => r.code?.trim() && r.name?.trim())
      .map(r => ({
        code:        r.code.trim().toUpperCase(),
        name:        r.name.trim(),
        model:       r.model?.trim() || null,
        category:    r.category?.trim() || null,
        description: r.description?.trim() || null,
        active:      toBool(r.active),
      }));
    if (!toInsert.length) return { imported: 0, errors: ["Tidak ada baris valid (code & name wajib)"] };
    const { data: imported, error } = await supabase
      .from("products")
      .upsert(toInsert, { onConflict: "code" })
      .select();
    if (error) throw new Error(error.message);
    return { imported: (imported ?? []).length, errors: [] as string[] };
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <AdminSection
        title="Master Produk"
        description="Katalog produk yang diproduksi, beserta lini produksi yang bisa membuatnya"
        onAdd={openAdd}
        rightSlot={
          <CsvButtons
            templateFilename="template-products.csv"
            templateHeaders={["code","name","model","category","description","active"]}
            templateSample={["PRD-001","CCU Motor A","X100","CCU","Produk CCU untuk motor type A","true"]}
            onImport={importProducts}
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
            <SortableDataTable
              cols={PROD_COLS}
              sortIdx={tc.sortIdx} onSort={tc.setSortIdx}
              colFilters={tc.colFilters} onColFilter={tc.setColFilter}
            >
              {tc.paged.map(p => {
                const assignedLines = (productLineMap.get(p.id) ?? [])
                  .map(lid => lineById.get(lid))
                  .filter(Boolean) as Line[];

                return (
                  <tr key={p.id} className="border-b hover:bg-surface-2">
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{p.code}</td>
                    <td className="px-3 py-2">
                      {p.category
                        ? <span className={categoryChip(p.category)}>{p.category}</span>
                        : <span className="text-muted-foreground/60 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.model ?? "—"}</td>
                    <td className="px-3 py-2">
                      {assignedLines.length === 0 ? (
                        <span className="text-muted-foreground/50 text-xs italic">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {assignedLines.map(l => (
                            <span key={l.id} className="chip chip-info font-mono text-[10px] px-1.5 py-0.5">
                              {l.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={p.active ? "chip chip-success" : "chip chip-warning"}>
                        {p.active ? "Aktif" : "Non-aktif"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <RowActions>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost"
                          onClick={() => confirm(`Hapus produk ${p.code}?`) && del.mutate(p.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </RowActions>
                    </td>
                  </tr>
                );
              })}
              {tc.paged.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                    {tc.search || tc.activeFilterCount > 0 ? "Tidak ada hasil" : "Belum ada produk"}
                  </td>
                </tr>
              )}
            </SortableDataTable>

            <Pager
              page={tc.page} totalPages={tc.totalPages} onChange={tc.setPage}
              filteredCount={tc.filteredCount} total={tc.total}
              pageSize={tc.pageSize} onPageSizeChange={tc.setPageSize}
            />
          </>
        )}
      </AdminSection>

      {/* ── Form Modal ──────────────────────────────────────────────────────── */}
      <FormModal
        open={open} onOpenChange={setOpen}
        title={form.id ? "Edit Produk" : "Tambah Produk"}
        onSubmit={handleSave}
        busy={saveBusy}
      >
        {/* Kode + Nama */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Kode <span className="text-destructive">*</span></Label>
            <Input
              value={form.code ?? ""} placeholder="PRD-001" className={errCls("code")}
              onChange={e => { clearErr("code"); setForm(f => ({ ...f, code: e.target.value.toUpperCase() })); }}
            />
            {errors.code && <p className="text-[11px] text-destructive">{errors.code}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Nama <span className="text-destructive">*</span></Label>
            <Input
              value={form.name ?? ""} placeholder="CCU Motor A" className={errCls("name")}
              onChange={e => { clearErr("name"); setForm(f => ({ ...f, name: e.target.value })); }}
            />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
          </div>
        </div>

        {/* Model + Kategori */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Model</Label>
            <Input value={form.model ?? ""} placeholder="X100"
              onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Input list="product-categories" value={form.category ?? ""} placeholder="Pilih atau ketik…"
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            <datalist id="product-categories">
              {allCategories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        {/* Lini Produksi — multi-select checkboxes */}
        <div className="space-y-2">
          <div>
            <Label>Lini Produksi</Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pilih lini yang dapat memproduksi produk ini. Bisa lebih dari satu.
            </p>
          </div>
          {lines.length === 0 ? (
            <p className="text-xs text-muted-foreground italic px-1">
              Belum ada data lini — tambahkan terlebih dahulu di tab Lini Produksi.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto rounded-lg border p-2 bg-slate-50/80">
              {lines.map(line => {
                const checked = formLineIds.includes(line.id);
                return (
                  <label
                    key={line.id}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 cursor-pointer transition-colors ${
                      checked ? "border-primary/60 bg-blue-50 text-primary" : "border-border bg-white hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLine(line.id)}
                      className="h-3.5 w-3.5 accent-primary shrink-0"
                    />
                    <span className="font-mono text-[11px] font-bold shrink-0">{line.code}</span>
                    <span className="text-xs text-muted-foreground truncate">{line.name}</span>
                  </label>
                );
              })}
            </div>
          )}
          {formLineIds.length > 0 && (
            <p className="text-[11px] text-primary font-medium">
              ✓ {formLineIds.length} lini dipilih:{" "}
              {formLineIds.map(id => lineById.get(id)?.code).filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        {/* Deskripsi */}
        <div className="space-y-1.5">
          <Label>Deskripsi</Label>
          <Textarea value={form.description ?? ""} placeholder="Deskripsi singkat produk…"
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>

        {/* Aktif */}
        <div className="flex items-center justify-between">
          <Label className="m-0">Aktif</Label>
          <Switch checked={form.active ?? true} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
        </div>
      </FormModal>
    </>
  );
}
