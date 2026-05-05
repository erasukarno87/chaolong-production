/**
 * ReferenceTab — Kelola semua tabel lookup/referensi yang dipakai di seluruh app.
 *
 * Berisi 5 section CRUD:
 *  1. Kategori Produk          (ref_product_categories)
 *  2. Klasifikasi NG           (ref_ng_classes)
 *  3. Klasifikasi Downtime     (ref_downtime_classes)
 *  4. Kategori Autonomous      (ref_autonomous_categories)
 *  5. Frekuensi Autonomous     (ref_autonomous_frequencies)
 *
 * Setiap section pakai komponen <LookupSection> yang reusable.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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

interface LookupItem {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
}

// ─── Reusable LookupSection ───────────────────────────────────────────────────

interface LookupSectionProps {
  tableName: string;
  title: string;
  description: string;
  namePlaceholder?: string;
}


const LOOKUP_SORT: SortOption<LookupItem>[] = [
  { label: "Urutan ↑", fn: (a, b) => a.sort_order - b.sort_order },
  { label: "Urutan ↓", fn: (a, b) => b.sort_order - a.sort_order },
  { label: "Nama A→Z", fn: (a, b) => a.name.localeCompare(b.name) },
  { label: "Nama Z→A", fn: (a, b) => b.name.localeCompare(a.name) },
];

const LOOKUP_COLS: ColDef[] = [
  { label: "Urut", sortAsc: 0, sortDesc: 1, className: "w-14" },
  { label: "Nama", sortAsc: 2, sortDesc: 3, filterKey: "name" },
  { label: "Status", className: "w-20" },
  { label: "", className: "w-[80px]" },
];
const LOOKUP_SEARCH: (keyof LookupItem)[] = ["name"];

function LookupSection({ tableName, title, description, namePlaceholder }: LookupSectionProps) {
  const importItems = async (rows: Record<string, string>[]) => {
    const toInsert = rows
      .filter(r => r.name?.trim())
      .map((r, i) => ({
        name:       r.name.trim(),
        sort_order: toInt(r.sort_order) ?? (i + 1) * 10,
        active:     toBool(r.active),
      }));
    if (!toInsert.length) return { imported: 0, errors: ["Tidak ada baris valid (name wajib)"] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from(tableName) as any)
      .upsert(toInsert, { onConflict: "name" }).select();
    if (error) throw new Error(error.message);
    return { imported: (data ?? []).length, errors: [] as string[] };
  };
  const qc = useQueryClient();
  const { data = [], isLoading } = useTable<LookupItem>(tableName, {
    orderBy: "sort_order", ascending: true,
  });
  const tc = useTableControls(data, LOOKUP_SEARCH, LOOKUP_SORT);
  const upsert = useUpsert(tableName);
  const del    = useDeleteRow(tableName);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<LookupItem>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearErr = (f: string) => setErrors(e => { const n = { ...e }; delete n[f]; return n; });
  const errCls   = (f: string) => errors[f] ? "border-destructive focus-visible:ring-destructive" : "";

  const openAdd = () => {
    const maxSort = data.length ? Math.max(...data.map(d => d.sort_order)) : 0;
    setForm({ name: "", sort_order: maxSort + 10, active: true });
    setErrors({});
    setOpen(true);
  };

  const openEdit = (item: LookupItem) => {
    setForm({ ...item });
    setErrors({});
    setOpen(true);
  };

  const handleSave = async () => {
    const newErr: Record<string, string> = {};
    if (!form.name?.trim()) newErr.name = "Nama wajib diisi";
    if (Object.keys(newErr).length > 0) { setErrors(newErr); return; }
    await upsert.mutateAsync({ ...form, name: form.name!.trim() });
    // useUpsert sudah invalidate ["table", tableName] di onSuccess-nya
    // invalidasi tambahan dengan key lengkap sebagai safety net
    qc.invalidateQueries({ queryKey: ["table", tableName] });
    setOpen(false);
  };

  return (
    <>
      <AdminSection title={title} description={description} onAdd={openAdd}
        rightSlot={
          <CsvButtons
            templateFilename={`template-${tableName}.csv`}
            templateHeaders={["name","sort_order","active"]}
            templateSample={[namePlaceholder ?? "Contoh Nama", 10, "true"]}
            onImport={importItems}
          />
        }>
        <TableToolbar
          search={tc.search} onSearch={tc.setSearch}
          total={tc.total} filteredCount={tc.filteredCount}
          activeFilterCount={tc.activeFilterCount} onClearColFilters={tc.clearColFilters}
        />
        {isLoading ? (
          <div className="text-sm text-muted-foreground p-4">Memuat…</div>
        ) : (
          <>
          <SortableDataTable cols={LOOKUP_COLS} sortIdx={tc.sortIdx} onSort={tc.setSortIdx} colFilters={tc.colFilters} onColFilter={tc.setColFilter}>
            {tc.paged.map(item => (
              <tr key={item.id} className="border-b hover:bg-surface-2">
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground w-16 text-center">
                  {item.sort_order}
                </td>
                <td className="px-3 py-2 font-medium">{item.name}</td>
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
                      onClick={() => confirm(`Hapus "${item.name}"?`) && del.mutate(item.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </RowActions>
                </td>
              </tr>
            ))}
            {tc.paged.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                  {tc.search ? "Tidak ada hasil" : "Belum ada data"}
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
        title={form.id ? `Edit — ${title}` : `Tambah — ${title}`}
        onSubmit={handleSave}
        busy={upsert.isPending}
      >
        <div className="space-y-1.5">
          <Label>Nama <span className="text-destructive">*</span></Label>
          <Input
            value={form.name ?? ""}
            placeholder={namePlaceholder ?? "Nama item…"}
            className={errCls("name")}
            onChange={e => { clearErr("name"); setForm(f => ({ ...f, name: e.target.value })); }}
          />
          {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Urutan Tampil</Label>
            <Input
              type="number" min={0}
              value={form.sort_order ?? 0}
              onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="flex items-end justify-between pb-0.5">
            <Label className="m-0">Aktif</Label>
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

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function ReferenceTab() {
  return (
      <div className="space-y-6">
      <LookupSection
        tableName="ref_product_categories"
        title="Kategori Produk"
        description="Klasifikasi produk untuk filter laporan NG dan downtime"
        namePlaceholder="Contoh: Finished Goods, WIP, Raw Material"
      />
      <LookupSection
        tableName="ref_ng_classes"
        title="Klasifikasi NG"
        description="Kelompok penyebab NG — dipakai di kategori NG sebagai datalist"
        namePlaceholder="Contoh: Machine, Man, Material, Method, Environment"
      />
      <LookupSection
        tableName="ref_downtime_classes"
        title="Klasifikasi Downtime (5M+E)"
        description="Kelompok penyebab downtime — dipakai di kategori Downtime sebagai datalist"
        namePlaceholder="Contoh: Machine, Man, Method, Material, Measurement"
      />
      <LookupSection
        tableName="ref_autonomous_categories"
        title="Kategori Autonomous"
        description="Jenis kegiatan autonomous — dipakai di item check Autonomous sebagai datalist"
        namePlaceholder="Contoh: Kebersihan, Pelumasan, Inspeksi"
      />
      <LookupSection
        tableName="ref_autonomous_frequencies"
        title="Frekuensi Autonomous"
        description="Jadwal pengulangan kegiatan autonomous — dipakai sebagai datalist"
        namePlaceholder="Contoh: Setiap Shift, Harian, Mingguan, Bulanan"
      />
    </div>
  );
}
