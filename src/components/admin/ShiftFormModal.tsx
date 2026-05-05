import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShiftBreak {
  id?: string;
  shift_id?: string;
  break_order: number;
  start_time: string;
  duration_minutes: number;
  label: string;
}

interface Shift {
  id: string;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  active: boolean;
  shift_breaks?: ShiftBreak[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMin(t: string): number {
  const [h, m] = (t ?? "00:00").split(":").map(Number);
  return h * 60 + m;
}

function shiftDurationMin(s: Pick<Shift, "start_time" | "end_time">): number {
  const diff = toMin(s.end_time) - toMin(s.start_time);
  return diff > 0 ? diff : diff + 24 * 60;
}

const EMPTY_BREAK = (): Omit<ShiftBreak, "break_order"> => ({
  start_time: "12:00",
  duration_minutes: 60,
  label: "Istirahat",
});

const EMPTY_SHIFT: Omit<Shift, "id" | "break_minutes"> = {
  code: "", name: "", start_time: "07:00", end_time: "15:00", active: true,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ShiftFormModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editShift: Shift | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ShiftFormModal({ open, onOpenChange, editShift }: ShiftFormModalProps) {
  const qc = useQueryClient();

  const [form, setForm]     = useState<Partial<Shift>>(EMPTY_SHIFT);
  const [breaks, setBreaks] = useState<Omit<ShiftBreak, "shift_id">[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearErr = (f: string) => setErrors(e => { const n = { ...e }; delete n[f]; return n; });
  const errCls   = (f: string) => errors[f] ? "border-destructive focus-visible:ring-destructive" : "";

  // ── Sync state when modal opens ──────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editShift) {
      setForm({ ...editShift });
      setBreaks(
        (editShift.shift_breaks ?? [])
          .sort((a, b) => a.break_order - b.break_order)
          .map(b => ({
            id:               b.id,
            break_order:      b.break_order,
            start_time:       (b.start_time ?? "").slice(0, 5),
            duration_minutes: b.duration_minutes,
            label:            b.label,
          }))
      );
    } else {
      setForm({ ...EMPTY_SHIFT });
      setBreaks([]);
    }
  }, [open, editShift]);

  // ── Save mutation ────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      const shiftPayload = {
        code:       form.code!,
        name:       form.name!,
        start_time: form.start_time!,
        end_time:   form.end_time!,
        active:     form.active ?? true,
      };
      let shiftId = form.id;
      if (shiftId) {
        const { error } = await supabase.from("shifts").update(shiftPayload).eq("id", shiftId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("shifts").insert(shiftPayload).select("id").single();
        if (error) throw error;
        shiftId = inserted.id;
      }
      await supabase.from("shift_breaks").delete().eq("shift_id", shiftId!);
      if (breaks.length > 0) {
        const rows = breaks.map((b, i) => ({
          shift_id:         shiftId,
          break_order:      i + 1,
          start_time:       b.start_time,
          duration_minutes: b.duration_minutes,
          label:            b.label || "Istirahat",
        }));
        const { error } = await supabase.from("shift_breaks").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts-with-breaks"] });
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift tersimpan");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Break list management ────────────────────────────────────────────────

  const addBreak = () => {
    if (breaks.length >= 3) return;
    setBreaks(prev => [...prev, { break_order: prev.length + 1, ...EMPTY_BREAK() }]);
  };

  const removeBreak = (idx: number) => setBreaks(prev => prev.filter((_, i) => i !== idx));

  const updateBreak = (idx: number, patch: Partial<ShiftBreak>) =>
    setBreaks(prev => prev.map((b, i) => i === idx ? { ...b, ...patch } : b));

  // ── Computed summary ─────────────────────────────────────────────────────

  const totalBreakMin = breaks.reduce((s, b) => s + (b.duration_minutes || 0), 0);
  const durationMin   = form.start_time && form.end_time ? shiftDurationMin(form as Shift) : 0;
  const netMin        = Math.max(0, durationMin - totalBreakMin);

  // suppress unused warning
  void netMin;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={form.id ? "Edit Shift" : "Tambah Shift"}
      size="xl"
      onSubmit={async () => {
        const newErr: Record<string, string> = {};
        if (!form.code?.trim()) newErr.code = "Kode wajib diisi";
        if (!form.name?.trim()) newErr.name = "Nama Shift wajib diisi";
        if (Object.keys(newErr).length > 0) { setErrors(newErr); return; }
        await saveMutation.mutateAsync();
      }}
      busy={saveMutation.isPending}
    >
      {/* Row 1: Kode + Nama */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Kode <span className="text-destructive">*</span></Label>
          <Input value={form.code ?? ""} placeholder="S1" className={errCls("code")}
            onChange={e => { clearErr("code"); setForm(f => ({ ...f, code: e.target.value.toUpperCase() })); }} />
          {errors.code && <p className="text-[11px] text-destructive">{errors.code}</p>}
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Nama <span className="text-destructive">*</span></Label>
          <Input value={form.name ?? ""} placeholder="Shift 1 (Pagi)" className={errCls("name")}
            onChange={e => { clearErr("name"); setForm(f => ({ ...f, name: e.target.value })); }} />
          {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
        </div>
      </div>

      {/* Row 2: Jam Mulai + Selesai */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Jam Mulai</Label>
          <TimeInput value={form.start_time?.slice(0, 5) ?? "07:00"}
            onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Jam Selesai</Label>
          <TimeInput value={form.end_time?.slice(0, 5) ?? "15:00"}
            onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
        </div>
      </div>

      {/* Break section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="m-0">
            Jadwal Istirahat
            <span className="text-muted-foreground font-normal ml-1.5 text-xs">
              ({breaks.length}/3 sesi)
            </span>
          </Label>
          <Button type="button" size="sm" variant="outline"
            disabled={breaks.length >= 3} onClick={addBreak}
            className="text-xs h-7 gap-1">
            <Plus className="h-3 w-3" /> Tambah Istirahat
          </Button>
        </div>

        {breaks.length === 0 && (
          <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground text-center">
            Belum ada jadwal istirahat.
          </div>
        )}

        {breaks.map((b, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_100px_1fr_auto] gap-2 items-end rounded-lg border px-3 py-2.5 bg-surface-2">
            <div className="space-y-1">
              <Label className="text-xs">Mulai</Label>
              <TimeInput
                value={b.start_time?.slice(0, 5) ?? "12:00"}
                onChange={e => updateBreak(idx, { start_time: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Durasi (mnt)</Label>
              <Input type="number" min={1} max={120}
                value={b.duration_minutes ?? 30}
                onChange={e => updateBreak(idx, { duration_minutes: parseInt(e.target.value) || 30 })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                value={b.label ?? ""}
                placeholder="Istirahat Makan, Sholat, dll"
                onChange={e => updateBreak(idx, { label: e.target.value })}
              />
            </div>
            <Button type="button" size="icon" variant="ghost"
              className="text-destructive hover:bg-destructive/10 shrink-0"
              onClick={() => removeBreak(idx)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {breaks.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Total break:{" "}
            <span className="font-mono font-semibold">
              {breaks.reduce((s, b) => s + (b.duration_minutes ?? 0), 0)} mnt
            </span>
          </p>
        )}
      </div>

      {/* Aktif */}
      <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
        <div>
          <Label className="m-0">Status Aktif</Label>
          <p className="text-[11px] text-muted-foreground">Shift non-aktif tidak bisa dipilih saat input WO</p>
        </div>
        <Switch
          checked={form.active ?? true}
          onCheckedChange={v => setForm(f => ({ ...f, active: v }))}
        />
      </div>
    </FormModal>
  );
}
