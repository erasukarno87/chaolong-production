/**
 * ProcessFormModal — Add/Edit Workstation form modal.
 * Handles: line selection, code auto-generation, cycle time, active toggle.
 */
import { useEffect, useState } from "react";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUpsert } from "@/hooks/useCrud";

// ─── Types (exported for ProcessesTab) ───────────────────────────────────────

export interface Line { id: string; code: string; name: string; }
export interface Process {
  id: string; line_id: string | null; code: string; name: string;
  sort_order: number; cycle_time_seconds: number | null; active: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateCode(lineId: string, lines: Line[], procs: Process[]): string {
  const lineCode = lines.find(l => l.id === lineId)?.code ?? "POS";
  const count    = procs.filter(p => p.line_id === lineId).length;
  return `${lineCode}-${String(count + 1).padStart(2, "0")}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProcessFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editProcess: Process | null;
  lines: Line[];
  procs: Process[];
  onSuccess?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProcessFormModal({
  open, onOpenChange, editProcess, lines, procs, onSuccess,
}: ProcessFormModalProps) {
  const upsertProc = useUpsert("processes");
  const [form, setForm]     = useState<Partial<Process>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = !!form.id;

  // Sync form state when modal opens or edit target changes
  useEffect(() => {
    if (!open) return;
    if (editProcess) {
      setForm({ ...editProcess });
    } else {
      const firstLineId = lines[0]?.id ?? null;
      setForm({
        line_id:            firstLineId,
        code:               firstLineId ? generateCode(firstLineId, lines, procs) : "",
        name:               "",
        sort_order:         firstLineId ? (procs.filter(p => p.line_id === firstLineId).length + 1) * 10 : 10,
        cycle_time_seconds: null,
        active:             true,
      });
    }
    setErrors({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editProcess?.id]);

  const clearErr = (f: string) => setErrors(e => { const n = { ...e }; delete n[f]; return n; });
  const errCls   = (f: string) => errors[f] ? "border-destructive focus-visible:ring-destructive" : "";

  const handleLineChange = (lineId: string) => {
    if (isEdit) { setForm(f => ({ ...f, line_id: lineId })); return; }
    setForm(f => ({
      ...f,
      line_id:    lineId,
      code:       generateCode(lineId, lines, procs),
      sort_order: (procs.filter(p => p.line_id === lineId).length + 1) * 10,
    }));
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={isEdit ? `Edit — ${form.code}` : "Tambah Workstation"}
      onSubmit={async () => {
        const newErr: Record<string, string> = {};
        if (!form.line_id) newErr.line_id = "Pilih Lini terlebih dahulu";
        if (!form.name?.trim()) newErr.name = "Nama Workstation wajib diisi";
        if (Object.keys(newErr).length > 0) { setErrors(newErr); return; }
        await upsertProc.mutateAsync(form);
        onOpenChange(false);
        onSuccess?.();
      }}
      busy={upsertProc.isPending}
    >
      <div className="space-y-1.5">
        <Label>Lini Produksi <span className="text-destructive">*</span></Label>
        <select
          className={`w-full h-10 rounded-md border bg-background px-3 text-sm ${errors.line_id ? "border-destructive" : ""}`}
          value={form.line_id ?? ""}
          onChange={e => { clearErr("line_id"); handleLineChange(e.target.value); }}
        >
          <option value="">— Pilih Lini —</option>
          {lines.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
        </select>
        {errors.line_id && <p className="text-[11px] text-destructive">{errors.line_id}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>
          Kode Workstation
          {!isEdit && <span className="ml-2 text-[11px] text-muted-foreground font-normal">(otomatis dari Lini + Nomor Urut)</span>}
        </Label>
        <div className="relative">
          <Input
            value={form.code ?? ""}
            readOnly={!isEdit}
            className={!isEdit ? "bg-surface-2 text-muted-foreground cursor-default font-mono" : "font-mono"}
            onChange={e => isEdit && setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
          />
          {!isEdit && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">auto</span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Nama Workstation <span className="text-destructive">*</span></Label>
        <Input
          value={form.name ?? ""}
          placeholder="Contoh: Assembly Station"
          className={errCls("name")}
          onChange={e => { clearErr("name"); setForm(f => ({ ...f, name: e.target.value })); }}
        />
        {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Nomor Urut</Label>
          <Input type="number" min={1} value={form.sort_order ?? 10}
            onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 10 }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Cycle Time Standar (detik)</Label>
          <Input
            type="number" min={0.01} step={0.01}
            placeholder="Contoh: 45.50"
            value={form.cycle_time_seconds ?? ""}
            onChange={e => setForm(f => ({
              ...f,
              cycle_time_seconds: e.target.value ? parseFloat(e.target.value) || null : null,
            }))}
          />
          <p className="text-[11px] text-muted-foreground">Nilai desimal diperbolehkan</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label className="m-0">Aktif</Label>
        <Switch
          checked={form.active ?? true}
          onCheckedChange={v => setForm(f => ({ ...f, active: v }))}
        />
      </div>
    </FormModal>
  );
}
