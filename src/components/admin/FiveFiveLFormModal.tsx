import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUpsert } from "@/hooks/useCrud";
import { toast } from "sonner";

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

// ─── Constants ────────────────────────────────────────────────────────────────

const INPUT_TYPES: { value: FiveFiveLItem["input_type"]; label: string; description: string }[] = [
  { value: "ok_ng", label: "OK / NG",       description: "Tombol OK atau NG" },
  { value: "float", label: "Angka (float)", description: "Input nilai numerik, misal voltage / arus" },
  { value: "text",  label: "Teks",          description: "Input teks bebas, misal versi firmware" },
];

const emptyForm = (defaultLineId?: string): Partial<FiveFiveLItem> => ({
  line_id:       defaultLineId ?? "",
  process_id:    null,
  sort_group:    1,
  group_name:    "",
  specification: "",
  method:        "Visual",
  input_type:    "ok_ng",
  sort_order:    0,
  active:        true,
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface FiveFiveLFormModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editItem: FiveFiveLItem | null;
  lines: Line[];
  processes: Process[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FiveFiveLFormModal({ open, onOpenChange, editItem, lines, processes }: FiveFiveLFormModalProps) {
  const qc = useQueryClient();

  const [form, setForm]     = useState<Partial<FiveFiveLItem>>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearErr = (f: string) => setErrors(e => { const n = { ...e }; delete n[f]; return n; });
  const errCls   = (f: string) => errors[f] ? "border-destructive focus-visible:ring-destructive" : "";

  const upsert = useUpsert("fivef5l_check_items");

  // ── Sync state when modal opens ──────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editItem) {
      setForm({ ...editItem });
    } else {
      setForm(emptyForm(lines[0]?.id));
    }
  }, [open, editItem, lines]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const lineProcesses = processes.filter(p => p.line_id === form.line_id);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["fivef5l-check-items"] });

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const newErr: Record<string, string> = {};
    if (!form.line_id) newErr.line_id = "Pilih Line terlebih dahulu";
    if (!form.group_name?.trim()) newErr.group_name = "Nama Grup wajib diisi";
    if (!form.specification?.trim()) newErr.specification = "Spesifikasi wajib diisi";
    if (Object.keys(newErr).length > 0) { setErrors(newErr); return; }
    if (!form.sort_group || form.sort_group < 1) {
      toast.error("Nomor Grup harus ≥ 1"); return;
    }

    await upsert.mutateAsync({
      ...form,
      group_name:    form.group_name!.trim(),
      specification: form.specification!.trim(),
      method:        form.method?.trim() || "Visual",
      process_id:    form.process_id || null,
      sort_order:    form.sort_order ?? 0,
    });
    invalidate();
    onOpenChange(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={form.id ? "Edit Item Check 5F5L" : "Tambah Item Check 5F5L"}
      size="2xl"
      onSubmit={handleSave}
      busy={upsert.isPending}
    >
      {/* ── Row 1: Line ── */}
      <div className="space-y-1.5">
        <Label>Lini Produksi <span className="text-destructive">*</span></Label>
        <select
          className={`w-full h-10 rounded-md border bg-background px-3 text-sm ${errors.line_id ? "border-destructive" : ""}`}
          value={form.line_id ?? ""}
          onChange={e => { clearErr("line_id"); setForm(f => ({ ...f, line_id: e.target.value, process_id: null })); }}
        >
          <option value="">— pilih lini —</option>
          {lines.map(l => (
            <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
          ))}
        </select>
        {errors.line_id && <p className="text-[11px] text-destructive">{errors.line_id}</p>}
      </div>

      {/* ── Row 2: No Grup + Nama Grup ── */}
      <div className="grid grid-cols-5 gap-3">
        <div className="space-y-1.5">
          <Label>No Grup <span className="text-destructive">*</span></Label>
          <Input
            type="number"
            min={1}
            value={form.sort_group ?? 1}
            onChange={e => setForm(f => ({ ...f, sort_group: parseInt(e.target.value) || 1 }))}
          />
          <p className="text-[11px] text-muted-foreground">Kolom "No" di checksheet</p>
        </div>
        <div className="col-span-4 space-y-1.5">
          <Label>Nama Grup / Checking Point <span className="text-destructive">*</span></Label>
          <Input
            value={form.group_name ?? ""}
            placeholder="Burning Program (BETA)"
            className={errCls("group_name")}
            onChange={e => { clearErr("group_name"); setForm(f => ({ ...f, group_name: e.target.value })); }}
          />
          {errors.group_name && <p className="text-[11px] text-destructive">{errors.group_name}</p>}
          <p className="text-[11px] text-muted-foreground">
            Baris dengan No Grup yang sama akan dikelompokkan. Isi nama yang identik untuk sub-item satu grup.
          </p>
        </div>
      </div>

      {/* ── Row 3: Spesifikasi ── */}
      <div className="space-y-1.5">
        <Label>Spesifikasi <span className="text-destructive">*</span></Label>
        <textarea
          className={`w-full min-h-[72px] rounded-md border bg-background px-3 py-2 text-sm resize-none ${errors.specification ? "border-destructive" : ""}`}
          value={form.specification ?? ""}
          placeholder="Voltage step 1 : 1.5 ~ 1.7 V"
          onChange={e => { clearErr("specification"); setForm(f => ({ ...f, specification: e.target.value })); }}
        />
        {errors.specification && <p className="text-[11px] text-destructive">{errors.specification}</p>}
      </div>

      {/* ── Row 4: Tipe Input + Metode + Sort Order ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Tipe Input <span className="text-destructive">*</span></Label>
          <select
            className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            value={form.input_type ?? "ok_ng"}
            onChange={e => setForm(f => ({ ...f, input_type: e.target.value as FiveFiveLItem["input_type"] }))}
          >
            {INPUT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label} — {t.description}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Metode</Label>
          <Input
            value={form.method ?? "Visual"}
            placeholder="Visual"
            onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Urutan dalam Grup</Label>
          <Input
            type="number"
            min={0}
            value={form.sort_order ?? 0}
            onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
          />
          <p className="text-[11px] text-muted-foreground">Urutan sub-item dalam grup yang sama</p>
        </div>
      </div>

      {/* ── Row 5: Workstation (opsional) ── */}
      <div className="space-y-1.5">
        <Label>
          Workstation
          <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(opsional)</span>
        </Label>
        <select
          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
          value={form.process_id ?? ""}
          onChange={e => setForm(f => ({ ...f, process_id: e.target.value || null }))}
          disabled={!form.line_id}
        >
          <option value="">— Tidak terikat workstation —</option>
          {lineProcesses.map(p => (
            <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
          ))}
        </select>
        {form.line_id && lineProcesses.length === 0 && (
          <p className="text-[11px] text-amber-600">
            Lini ini belum memiliki workstation. Tambahkan di tab Workstation jika diperlukan.
          </p>
        )}
      </div>

      {/* ── Aktif ── */}
      <div className="flex items-center justify-between pt-1">
        <Label className="m-0">Aktif</Label>
        <Switch
          checked={form.active ?? true}
          onCheckedChange={v => setForm(f => ({ ...f, active: v }))}
        />
      </div>
    </FormModal>
  );
}
