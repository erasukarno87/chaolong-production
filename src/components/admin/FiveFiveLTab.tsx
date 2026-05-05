/**
 * FiveFiveLTab — CRUD master data item check 5F5L (5 First / 5 Last) per Line
 *
 * Struktur dokumen:
 *  - Tiap "No" (sort_group) = satu kelompok checking point
 *  - Tiap kelompok bisa memiliki beberapa baris spesifikasi (sub-item)
 *  - Input type: ok_ng | float | text
 *  - Item yang sama digunakan untuk sesi 5 First dan 5 Last
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminSection, RowActions, TableToolbar } from "@/components/admin/AdminSection";
import { useTableControls, SortOption } from "@/hooks/useTableControls";
import { CsvButtons } from "@/components/admin/CsvButtons";
import { toBool, toInt } from "@/lib/csv-utils";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useDeleteRow, useTable } from "@/hooks/useCrud";
import { FiveFiveLFormModal } from "./FiveFiveLFormModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FiveFiveLItem {
  id: string;
  line_id: string;
  process_id: string | null;
  sort_group: number;
  group_name: string;
  specification: string;
  method: string;
  input_type: "ok_ng" | "float" | "text";
  sort_order: number;
  active: boolean;
}
interface Line    { id: string; code: string; name: string; }
interface Process { id: string; line_id: string | null; code: string; name: string; }

const INPUT_TYPE_CHIP: Record<FiveFiveLItem["input_type"], string> = {
  ok_ng: "chip chip-success",
  float: "chip chip-info",
  text:  "bg-amber-100 text-amber-700 chip",
};
const INPUT_TYPE_LABEL: Record<FiveFiveLItem["input_type"], string> = {
  ok_ng: "OK/NG", float: "Float", text: "Teks",
};

const INPUT_TYPES = [
  { value: "ok_ng" as const, label: "OK/NG", description: "Pilihan OK atau NG" },
  { value: "float" as const, label: "Float", description: "Angka desimal" },
  { value: "text" as const, label: "Teks", description: "Input teks bebas" },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useFiveFiveLItems(lineId: string | null) {
  return useQuery<FiveFiveLItem[]>({
    queryKey: ["fivef5l-check-items", lineId],
    queryFn: async () => {
      let q = supabase
        .from("fivef5l_check_items")
        .select("*")
        .order("sort_group")
        .order("sort_order");
      if (lineId) q = q.eq("line_id", lineId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FiveFiveLItem[];
    },
  });
}

// ─── Component ────────────────────────────────────────────────────────────────


const F5L_SORT: SortOption<FiveFiveLItem>[] = [
  { label: "Urutan ↑", fn: (a, b) => a.sort_order - b.sort_order },
  { label: "Kode Grup ↑", fn: (a, b) => a.sort_group - b.sort_group },
  { label: "Nama A→Z", fn: (a, b) => a.group_name.localeCompare(b.group_name) },
];
const F5L_SEARCH: (keyof FiveFiveLItem)[] = ["group_name", "specification", "method"];

export function FiveFiveLTab() {
  const qc = useQueryClient();
  const { data: lines     = [] } = useTable<Line>("lines",    { orderBy: "code", ascending: true });
  const { data: processes = [] } = useTable<Process>("processes", { orderBy: "sort_order", ascending: true });

  const [filterLineId, setFilterLineId] = useState<string | null>(null);
  const { data = [], isLoading } = useFiveFiveLItems(filterLineId);
  const tc = useTableControls(data, F5L_SEARCH, F5L_SORT);

  const [open, setOpen]         = useState(false);
  const [editItem, setEditItem] = useState<FiveFiveLItem | null>(null);
  const del = useDeleteRow("fivef5l_check_items");

  const lineMap: Record<string, Line> = Object.fromEntries(lines.map(l => [l.id, l]));
  const invalidate = () => qc.invalidateQueries({ queryKey: ["fivef5l-check-items"] });

  const handleDelete = (id: string, spec: string) => {
    if (!confirm(`Hapus item "${spec}"?`)) return;
    del.mutate(id, { onSuccess: invalidate });
  };
  const openAdd  = () => { setEditItem(null); setOpen(true); };
  const openEdit = (item: FiveFiveLItem) => { setEditItem(item); setOpen(true); };

  // ── Kelompokkan per group dalam satu line ────────────────────────────────
  // data sudah diurutkan order(sort_group).order(sort_order)
  const groupItems = (items: FiveFiveLItem[]) => {
    const groups: { groupNo: number; groupName: string; items: FiveFiveLItem[] }[] = [];
    for (const item of items) {
      const last = groups[groups.length - 1];
      if (last && last.groupNo === item.sort_group) {
        last.items.push(item);
      } else {
        groups.push({ groupNo: item.sort_group, groupName: item.group_name, items: [item] });
      }
    }
    return groups;
  };

  // Kelompokkan per line saat filter = "Semua"
  const groupedByLine: Record<string, FiveFiveLItem[]> = {};
  for (const item of tc.paged) {
    if (!groupedByLine[item.line_id]) groupedByLine[item.line_id] = [];
    groupedByLine[item.line_id].push(item);
  }

  // ── CSV Import ───────────────────────────────────────────────────────────
  const importItems = async (rows: Record<string, string>[]) => {
    const lm = new Map(lines.map(l => [l.code.toUpperCase(), l.id]));
    const errors: string[] = [];
    const toInsert = rows
      .filter(r => r.line_code?.trim() && r.group_name?.trim() && r.specification?.trim())
      .map((r, i) => {
        const lc  = r.line_code.trim().toUpperCase();
        const lid = lm.get(lc);
        if (!lid) { errors.push(`Row ${i+1}: line_code "${r.line_code}" tidak ditemukan`); return null; }
        const inputType = (r.input_type?.trim() ?? "ok_ng") as FiveFiveLItem["input_type"];
        if (!["ok_ng","float","text"].includes(inputType)) {
          errors.push(`Row ${i+1}: input_type "${inputType}" tidak valid (ok_ng/float/text)`);
          return null;
        }
        return {
          line_id:       lid,
          sort_group:    toInt(r.sort_group)  ?? 1,
          group_name:    r.group_name.trim(),
          specification: r.specification.trim(),
          method:        r.method?.trim()     || "Visual",
          input_type:    inputType,
          sort_order:    toInt(r.sort_order)  ?? (i + 1) * 10,
          active:        toBool(r.active),
        };
      })
      .filter(Boolean) as Record<string, unknown>[];
    if (!toInsert.length) return { imported: 0, errors: errors.length ? errors : ["Tidak ada baris valid"] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: res, error } = await (supabase.from("fivef5l_check_items") as any)
      .upsert(toInsert, { onConflict: "line_id,sort_group,sort_order" }).select();
    if (error) throw new Error(error.message);
    invalidate();
    return { imported: (res ?? []).length, errors };
  };

  // ── Render helpers ───────────────────────────────────────────────────────
  const renderGroupedTable = (items: FiveFiveLItem[]) => {
    const groups = groupItems(items);
    return (
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-8">No</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Checking Point</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Spesifikasi</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-28">Metode</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-20">Input</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-16">Workstation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-16">Status</th>
              <th className="px-3 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ groupNo, groupName, items: gItems }) =>
              gItems.map((item, idx) => (
                <tr key={item.id} className="border-b hover:bg-surface-2">
                  {/* No — hanya tampil pada baris pertama tiap grup, dengan rowspan */}
                  {idx === 0 && (
                    <td
                      className="px-3 py-2 font-mono text-xs font-bold text-center align-top"
                      rowSpan={gItems.length}
                    >
                      {groupNo}
                    </td>
                  )}
                  {/* Nama Grup — hanya tampil pada baris pertama */}
                  {idx === 0 && (
                    <td
                      className="px-3 py-2 font-medium text-sm align-top leading-snug max-w-[160px]"
                      rowSpan={gItems.length}
                    >
                      {groupName}
                    </td>
                  )}
                  <td className="px-3 py-2 text-xs text-muted-foreground leading-snug max-w-[240px]">
                    {item.specification}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{item.method}</td>
                  <td className="px-3 py-2">
                    <span className={INPUT_TYPE_CHIP[item.input_type]}>
                      {INPUT_TYPE_LABEL[item.input_type]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {(() => {
                      const ws = processes.find(p => p.id === item.process_id);
                      return ws
                        ? <span className="chip chip-info text-[10px] font-mono">{ws.code}</span>
                        : <span className="text-muted-foreground/30 text-xs">—</span>;
                    })()}
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
                        onClick={() => handleDelete(item.id, item.specification)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </RowActions>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <AdminSection
        title="Master Data 5F5L — 5 First / 5 Last Inspection"
        description="Item check yang digunakan pada inspeksi 5 unit pertama (5 First) dan 5 unit terakhir (5 Last) per sesi produksi. Konten item identik — hanya waktu pelaksanaan yang berbeda."
        onAdd={openAdd}
        rightSlot={
          <CsvButtons
            templateFilename="template-5f5l.csv"
            templateHeaders={["line_code","sort_group","group_name","specification","method","input_type","sort_order","active"]}
            templateSample={["FA-CCU-A","1","Burning Program (BETA)","Voltage step 1 : 1.5 ~ 1.7 V","Visual","float",10,"true"]}
            onImport={importItems}
          />
        }
      >
        {/* ── Filter per Line ── */}
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

        {/* ── Legend input type ── */}
        <div className="flex items-center gap-3 mb-3 text-[11px] text-muted-foreground">
          <span className="font-medium">Tipe Input:</span>
          {INPUT_TYPES.map(t => (
            <span key={t.value} className="flex items-center gap-1">
              <span className={INPUT_TYPE_CHIP[t.value]}>{t.label}</span>
              <span>= {t.description}</span>
            </span>
          ))}
        </div>

        <TableToolbar
          search={tc.search} onSearch={tc.setSearch}
          sortOptions={F5L_SORT.map(o => o.label)} sortIdx={tc.sortIdx} onSort={tc.setSortIdx}
          total={tc.total} filteredCount={tc.filteredCount}
        />
        {isLoading ? (
          <div className="text-sm text-muted-foreground p-4">Memuat…</div>
        ) : tc.paged.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Belum ada item check 5F5L.{" "}
            {filterLineId
              ? `Klik "+ Tambah" untuk menambahkan item pada lini ${lineMap[filterLineId]?.code ?? ""}.`
              : "Pilih lini dan klik \"+ Tambah\", atau gunakan Import CSV."}
          </div>
        ) : filterLineId ? (
          /* ── Single-line view ── */
          renderGroupedTable(tc.paged)
        ) : (
          /* ── All-lines view: grouped per line ── */
          <div className="space-y-6">
            {Object.entries(groupedByLine).map(([lid, items]) => {
              const line = lineMap[lid];
              return (
                <div key={lid}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono font-semibold text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {line?.code ?? lid}
                    </span>
                    <span className="text-sm font-medium">{line?.name}</span>
                    <span className="text-xs text-muted-foreground">— {items.length} item</span>
                  </div>
                  {renderGroupedTable(items)}
                </div>
              );
            })}
          </div>
        )}
      </AdminSection>

      <FiveFiveLFormModal
        open={open}
        onOpenChange={setOpen}
        editItem={editItem}
        lines={lines}
        processes={processes}
      />
    </>
  );
}
