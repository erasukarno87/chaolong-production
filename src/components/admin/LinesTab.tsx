import { useState } from "react";
import { AdminSection, DataTable, RowActions, TableToolbar, Pager } from "@/components/admin/AdminSection";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useTable, useUpsert, useDeleteRow } from "@/hooks/useCrud";
import { supabase } from "@/integrations/supabase/client";
import { CsvButtons } from "@/components/admin/CsvButtons";
import { toBool } from "@/lib/csv-utils";
import { useTableControls, PAGE_SIZE, SortOption } from "@/hooks/useTableControls";

interface Line {
  id: string; code: string; name: string; description: string | null; active: boolean;
}

const empty: Partial<Line> = { code: "", name: "", description: "", active: true };

const LINE_SORT: SortOption<Line>[] = [
  { label: "Kode A→Z",  fn: (a, b) => a.code.localeCompare(b.code) },
  { label: "Kode Z→A",  fn: (a, b) => b.code.localeCompare(a.code) },
  { label: "Nama A→Z",  fn: (a, b) => a.name.localeCompare(b.name) },
  { label: "Nama Z→A",  fn: (a, b) => b.name.localeCompare(a.name) },
];
const LINE_SEARCH: (keyof Line)[] = ["code", "name", "description"];

export function LinesTab() {
  const { data = [], isLoading } = useTable<Line>("lines", { orderBy: "code", ascending: true });
  const upsert = useUpsert("lines");
  const del = useDeleteRow("lines");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Line>>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearErr = (f: string) => setErrors(e => { const n = { ...e }; delete n[f]; return n; });
  const errCls   = (f: string) => errors[f] ? "border-destructive focus-visible:ring-destructive" : "";

  const tc = useTableControls(data, LINE_SEARCH, LINE_SORT);

  const startAdd = () => { setForm(empty); setErrors({}); setOpen(true); };
  const startEdit = (l: Line) => { setForm(l); setErrors({}); setOpen(true); };

  const importLines = async (rows: Record<string, string>[]) => {
    const toInsert = rows
      .filter(r => r.code?.trim() && r.name?.trim())
      .map(r => ({
        code:        r.code.trim().toUpperCase(),
        name:        r.name.trim(),
        description: r.description?.trim() || null,
        active:      toBool(r.active),
      }));
    if (!toInsert.length) return { imported: 0, errors: ["Tidak ada baris valid (code & name wajib)"] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("lines") as any)
      .upsert(toInsert, { onConflict: "code" }).select();
    if (error) throw new Error(error.message);
    return { imported: (data ?? []).length, errors: [] as string[] };
  };
  const submit = async () => {
    const newErr: Record<string, string> = {};
    if (!form.code?.trim()) newErr.code = "Kode wajib diisi";
    if (!form.name?.trim()) newErr.name = "Nama wajib diisi";
    if (Object.keys(newErr).length > 0) { setErrors(newErr); return; }
    await upsert.mutateAsync(form);
    setOpen(false);
  };

  return (
    <>
      <AdminSection title="Lini Produksi" description="Daftar lini produksi aktif" onAdd={startAdd}
        rightSlot={
          <CsvButtons
            templateFilename="template-lines.csv"
            templateHeaders={["code","name","description","active"]}
            templateSample={["LINE-A","Lini Produksi A","Lini perakitan CCU","true"]}
            onImport={importLines}
          />
        }>
        <TableToolbar
          search={tc.search} onSearch={tc.setSearch}
          sortOptions={LINE_SORT.map(o => o.label)} sortIdx={tc.sortIdx} onSort={tc.setSortIdx}
          total={tc.total} filteredCount={tc.filteredCount}
        />
        {isLoading ? <div className="text-sm text-muted-foreground p-4">Memuat…</div> : (
          <>
            <DataTable headers={["Kode", "Nama", "Status", "Deskripsi", ""]}>
              {tc.paged.map(l => (
                <tr key={l.id} className="border-b hover:bg-surface-2">
                  <td className="px-3 py-2 font-mono text-xs">{l.code}</td>
                  <td className="px-3 py-2 font-medium">{l.name}</td>
                  <td className="px-3 py-2">
                    <span className={l.active ? "chip chip-success" : "chip chip-warning"}>
                      {l.active ? "Aktif" : "Non-aktif"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{l.description}</td>
                  <td className="px-3 py-2">
                    <RowActions>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost"
                        onClick={() => confirm(`Hapus lini ${l.code}?`) && del.mutate(l.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </RowActions>
                  </td>
                </tr>
              ))}
              {tc.paged.length === 0 && (
                <tr><td colSpan={5} className="text-center py-6 text-muted-foreground text-sm">
                  {tc.search ? "Tidak ada hasil" : "Belum ada lini"}
                </td></tr>
              )}
            </DataTable>
            <Pager page={tc.page} totalPages={tc.totalPages} onChange={tc.setPage} filteredCount={tc.filteredCount} pageSize={PAGE_SIZE} />
          </>
        )}
      </AdminSection>

      <FormModal open={open} onOpenChange={setOpen}
        title={form.id ? "Edit Lini" : "Tambah Lini"}
        onSubmit={submit}
        busy={upsert.isPending}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kode <span className="text-destructive">*</span></Label>
              <Input value={form.code ?? ""} placeholder="LINE-A" className={errCls("code")}
                onChange={e => { clearErr("code"); setForm(f => ({ ...f, code: e.target.value.toUpperCase() })); }} />
              {errors.code && <p className="text-[11px] text-destructive">{errors.code}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Nama <span className="text-destructive">*</span></Label>
              <Input value={form.name ?? ""} placeholder="Lini Produksi A" className={errCls("name")}
                onChange={e => { clearErr("name"); setForm(f => ({ ...f, name: e.target.value })); }} />
              {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Textarea value={form.description ?? ""} placeholder="Deskripsi singkat lini…"
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="m-0">Aktif</Label>
            <Switch checked={form.active ?? true}
              onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
          </div>
        </div>
      </FormModal>
    </>
  );
}
