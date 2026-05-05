/**
 * AutonomousTab — CRUD item check Autonomous Maintenance per Line
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminSection, SortableDataTable, ColDef, RowActions, TableToolbar, Pager } from "@/components/admin/AdminSection";
import { useTableControls, SortOption } from "@/hooks/useTableControls";
import { CsvButtons } from "@/components/admin/CsvButtons";
import { toBool, toInt } from "@/lib/csv-utils";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useDeleteRow, useTable } from "@/hooks/useCrud";
import { AutonomousCheckItemFormModal, type CheckItem, type Line, type Process } from "./AutonomousCheckItemFormModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RefItem { id: string; name: string; sort_order: number; active: boolean; }

const FREQ_CHIP: Record<string, string> = {
  "Setiap Shift": "chip chip-info",
  "Harian":       "chip chip-success",
  "Mingguan":     "chip chip-warning",
  "Bulanan":      "bg-purple-100 text-purple-700 chip",
};

function freqChip(freq: string) {
  return FREQ_CHIP[freq] ?? "chip";
}

const CAT_CHIP: Record<string, string> = {
  "Kebersihan":          "bg-sky-100 text-sky-700 chip",
  "Pelumasan":           "bg-amber-100 text-amber-700 chip",
  "Inspeksi":            "bg-blue-100 text-blue-700 chip",
  "Pengencangan":        "bg-orange-100 text-orange-700 chip",
  "K3":                  "bg-red-100 text-red-700 chip",
  "Pengecekan Visual":   "bg-indigo-100 text-indigo-700 chip",
  "Pengecekan Fungsi":   "bg-teal-100 text-teal-700 chip",
  "Pengukuran":          "bg-green-100 text-green-700 chip",
};

function catChip(cat: string | null) {
  if (!cat) return "chip";
  return CAT_CHIP[cat] ?? "chip";
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useCheckItems(lineId: string | null) {
  return useQuery<CheckItem[]>({
    queryKey: ["autonomous-check-items", lineId],
    queryFn: async () => {
      let q = supabase
        .from("autonomous_check_items")
        .select("*")
        .order("sort_order")
        .order("code");
      if (lineId) q = q.eq("line_id", lineId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CheckItem[];
    },
  });
}

// ─── Component ────────────────────────────────────────────────────────────────


const AUTO_SORT: SortOption<CheckItem>[] = [
  { label: "Urutan ↑", fn: (a, b) => a.sort_order - b.sort_order },
  { label: "Kode A→Z", fn: (a, b) => a.code.localeCompare(b.code) },
  { label: "Nama A→Z", fn: (a, b) => a.name.localeCompare(b.name) },
];

const AUTO_COLS: ColDef[] = [
  { label: "No",               sortAsc: 0, className: "w-12" },
  { label: "Kode",             sortAsc: 1, filterKey: "code" },
  { label: "Nama Item",        sortAsc: 2, filterKey: "name" },
  { label: "Workstation",      className: "w-32" },
  { label: "Kategori",         className: "w-28" },
  { label: "Frekuensi",        className: "w-24" },
  { label: "Standar / Target" },
  { label: "Metode",           className: "w-24" },
  { label: "Img",              className: "w-14" },
  { label: "Status",           className: "w-20" },
  { label: "",                 className: "w-[80px]" },
];
const AUTO_SEARCH: (keyof CheckItem)[] = ["code", "name", "category", "frequency"];

export function AutonomousTab() {
  const qc = useQueryClient();
  const { data: lines     = [] } = useTable<Line>("lines",    { orderBy: "code", ascending: true });
  const { data: processes = [] } = useTable<Process>("processes", { orderBy: "sort_order", ascending: true });
  const { data: refCats   = [] } = useTable<RefItem>("ref_autonomous_categories",  { orderBy: "sort_order", ascending: true });
  const { data: refFreqs  = [] } = useTable<RefItem>("ref_autonomous_frequencies", { orderBy: "sort_order", ascending: true });

  const [filterLineId, setFilterLineId] = useState<string | null>(null);
  const { data = [], isLoading } = useCheckItems(filterLineId);
  const tc = useTableControls(data, AUTO_SEARCH, AUTO_SORT);

  const [open, setOpen]         = useState(false);
  const [editItem, setEditItem] = useState<CheckItem | null>(null);
  const del = useDeleteRow("autonomous_check_items");

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Hapus item "${name}"?`)) return;
    del.mutate(id, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["autonomous-check-items"] });
      },
    });
  };

  // Kategori: dari ref table + backward compat dari data yang sudah ada
  const allCategories = Array.from(new Set([
    ...refCats.filter(r => r.active).map(r => r.name),
    ...data.map(c => c.category).filter(Boolean) as string[],
  ])).sort();

  // Frekuensi: dari ref table + backward compat
  const allFrequencies = Array.from(new Set([
    ...refFreqs.filter(r => r.active).map(r => r.name),
    ...data.map(c => c.frequency).filter(Boolean),
  ]));

  const openAdd = () => { setEditItem(null); setOpen(true); };
  const openEdit = (item: CheckItem) => { setEditItem(item); setOpen(true); };

  // Kelompokkan per line saat filter = "Semua"
  const groupedByLine: Record<string, CheckItem[]> = {};
  for (const item of tc.paged) {
    if (!groupedByLine[item.line_id]) groupedByLine[item.line_id] = [];
    groupedByLine[item.line_id].push(item);
  }

  const lineMap: Record<string, Line> = Object.fromEntries(lines.map(l => [l.id, l]));

  // ── CSV Import ───────────────────────────────────────────────────────────
  const importCheckItems = async (rows: Record<string, string>[]) => {
    const lm = new Map(lines.map(l => [l.code.toUpperCase(), l.id]));
    const errors: string[] = [];
    const toInsert = rows
      .filter(r => r.line_code?.trim() && r.code?.trim() && r.name?.trim())
      .map((r, i) => {
        const lc = r.line_code.trim().toUpperCase();
        const lid = lm.get(lc);
        if (!lid) { errors.push(`${r.code}: line_code "${r.line_code}" tidak ditemukan`); return null; }
        return { line_id: lid, code: r.code.trim().toUpperCase(), name: r.name.trim(), category: r.category?.trim() || null, frequency: r.frequency?.trim() || "Setiap Shift", standard: r.standard?.trim() || null, method: r.method?.trim() || null, sort_order: toInt(r.sort_order) ?? (i + 1) * 10, active: toBool(r.active) };
      })
      .filter(Boolean) as Record<string, unknown>[];
    if (!toInsert.length) return { imported: 0, errors: errors.length ? errors : ["Tidak ada baris valid"] };
    const { data, error } = await supabase
      .from("autonomous_check_items")
      .upsert(toInsert, { onConflict: "line_id,code" })
      .select();
    if (error) throw new Error(error.message);
    qc.invalidateQueries({ queryKey: ["autonomous-check-items"] });
    return { imported: (data ?? []).length, errors };
  };

  return (
    <>
      <AdminSection
        title="Item Check Autonomous"
        description="Daftar item pemeriksaan autonomous per lini produksi — setiap line memiliki item yang berbeda"
        onAdd={openAdd}
        rightSlot={
          <CsvButtons
            templateFilename="template-autonomous.csv"
            templateHeaders={["line_code","code","name","category","frequency","standard","method","sort_order","active"]}
            templateSample={["LINE-A","AC-001","Cek Oli Mesin","Mesin","Harian","Min 80%","Visual",10,"true"]}
            onImport={importCheckItems}
          />
        }
      >
        {/* Filter per Line */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-muted-foreground">Filter Lini:</span>
          <button
            onClick={() => setFilterLineId(null)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filterLineId === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-surface-2 border-border"
            }`}
          >
            Semua
          </button>
          {lines.map(l => (
            <button
              key={l.id}
              onClick={() => setFilterLineId(l.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                filterLineId === l.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-surface-2 border-border"
              }`}
            >
              {l.code}
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
        ) : tc.paged.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Belum ada item check.{" "}
            {filterLineId
              ? `Klik "+ Tambah" untuk menambahkan item pada lini ${lineMap[filterLineId]?.code ?? ""}.`
              : "Pilih lini dan klik \"+ Tambah\"."}
          </div>
        ) : filterLineId ? (
          /* ── Single-line view: tabel biasa ── */
          <SortableDataTable cols={AUTO_COLS} sortIdx={tc.sortIdx} onSort={tc.setSortIdx} colFilters={tc.colFilters} onColFilter={tc.setColFilter}>
            {tc.paged.map((item, idx) => {
              const ws = processes.find(p => p.id === item.process_id);
              return (
                <tr key={item.id} className="border-b hover:bg-surface-2">
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground text-center w-8">
                    {item.sort_order > 0 ? item.sort_order : idx + 1}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs font-semibold">{item.code}</td>
                  <td className="px-3 py-2 font-medium text-sm">{item.name}</td>
                  <td className="px-3 py-2">
                    {ws
                      ? <span className="chip chip-info text-[10px]">{ws.name}</span>
                      : <span className="text-muted-foreground/40 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    {item.category
                      ? <span className={catChip(item.category)}>{item.category}</span>
                      : <span className="text-muted-foreground/60 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={freqChip(item.frequency)}>{item.frequency}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-[160px] truncate" title={item.standard ?? ""}>
                    {item.standard || <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-[120px] truncate" title={item.method ?? ""}>
                    {item.method || <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    {item.image_url
                      ? <img src={item.image_url} alt="" className="h-8 w-8 object-cover rounded border cursor-pointer" onClick={() => window.open(item.image_url!, "_blank")} title="Klik untuk lihat penuh" />
                      : <span className="text-muted-foreground/30 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={item.active ? "chip chip-success" : "chip chip-warning"}>
                      {item.active ? "Aktif" : "Non-aktif"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <RowActions>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost"
                        onClick={() => handleDelete(item.id, item.name)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </RowActions>
                  </td>
                </tr>
              );
            })}
          </SortableDataTable>
        ) : (
          /* ── All-lines view: grouped per line ── */
          <div className="space-y-5">
            {Object.entries(groupedByLine).map(([lid, items]) => {
              const line = lineMap[lid];
              return (
                <div key={lid}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono font-semibold text-xs bg-primary/10 text-primary-600 px-2 py-0.5 rounded">{line?.code ?? lid}</span>
                    <span className="text-sm font-medium text-foreground/80">{line?.name ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">({items.length} item)</span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-2">
                        <tr>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-8">No</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kode</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nama Item</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Workstation</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kategori</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Frekuensi</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                          <th className="px-3 py-2 w-16"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => {
                          const ws = processes.find(p => p.id === item.process_id);
                          return (
                            <tr key={item.id} className="border-b hover:bg-surface-2">
                              <td className="px-3 py-2 font-mono text-xs text-muted-foreground text-center">
                                {item.sort_order > 0 ? item.sort_order : idx + 1}
                              </td>
                              <td className="px-3 py-2 font-mono text-xs font-semibold">{item.code}</td>
                              <td className="px-3 py-2 font-medium text-sm">{item.name}</td>
                              <td className="px-3 py-2">
                                {ws
                                  ? <span className="chip chip-info text-[10px]">{ws.name}</span>
                                  : <span className="text-muted-foreground/40 text-xs">—</span>}
                              </td>
                              <td className="px-3 py-2">
                                {item.category
                                  ? <span className={catChip(item.category)}>{item.category}</span>
                                  : <span className="text-muted-foreground/60 text-xs">—</span>}
                              </td>
                              <td className="px-3 py-2">
                                <span className={freqChip(item.frequency)}>{item.frequency}</span>
                              </td>
                              <td className="px-3 py-2">
                                <span className={item.active ? "chip chip-success" : "chip chip-warning"}>
                                  {item.active ? "Aktif" : "Non-aktif"}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <RowActions>
                                  <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost"
                                    onClick={() => handleDelete(item.id, item.name)}>
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </RowActions>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filterLineId && (
          <Pager page={tc.page} totalPages={tc.totalPages} onChange={tc.setPage} filteredCount={tc.filteredCount} total={tc.total} pageSize={tc.pageSize} onPageSizeChange={tc.setPageSize} />
        )}
      </AdminSection>

      <AutonomousCheckItemFormModal
        open={open}
        onOpenChange={setOpen}
        editItem={editItem}
        lines={lines}
        processes={processes}
        allCategories={allCategories}
        allFrequencies={allFrequencies}
        onSuccess={() => {}}
      />
    </>
  );
}
