import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { NgEntryData } from "./types";
import { useSubProcesses, useDefectTypes } from "./useShiftModalData";

interface NgEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: NgEntryData) => Promise<void>;
  hourLabels?: string[];
  productId?: string;
}

const DISPOSITIONS: { id: NgEntryData["disposition"]; label: string }[] = [
  { id: "rework",   label: "Rework" },
  { id: "scrap",    label: "Scrap" },
  { id: "hold",     label: "QC Hold" },
  { id: "accepted", label: "Accept" },
];

export function NgEntryModal({ open, onOpenChange, onSubmit, hourLabels, productId }: NgEntryModalProps) {
  const hours = hourLabels && hourLabels.length > 0
    ? hourLabels
    : Array.from({ length: 8 }, (_, i) => {
        const sh = 7 + i;
        return `${String(sh).padStart(2, "0")}:00–${String(sh + 1).padStart(2, "0")}:00`;
      });

  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Partial<NgEntryData>>({
    hour_label: hours[0] ?? "07:00–08:00",
    process_id: "", defect_type_id: "", quantity: 1, disposition: "rework", description: "",
  });

  const { data: subProcesses = [], isLoading: spLoading } = useSubProcesses();
  const { data: defectTypes  = [], isLoading: dtLoading  } = useDefectTypes(productId);

  const handleSubmit = async () => {
    if (!form.process_id)     { toast.error("Workstation wajib dipilih"); return; }
    if (!form.defect_type_id) { toast.error("Jenis NG wajib dipilih");    return; }
    setBusy(true);
    try {
      await onSubmit(form as NgEntryData);
      setForm({ hour_label: hours[0] ?? "07:00–08:00", process_id: "", defect_type_id: "", quantity: 1, disposition: "rework", description: "" });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah NG");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>⚠️ Tambah NG Entry</DialogTitle>
          <DialogDescription>Catat defect dengan jenis, disposisi, dan jam terjadinya</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Jam Produksi</Label>
            <Select value={form.hour_label} onValueChange={v => setForm({ ...form, hour_label: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Workstation (lokasi NG)</Label>
            {spLoading ? <div className="text-xs text-muted-foreground py-2">Memuat…</div> : (
              <Select value={form.process_id} onValueChange={v => setForm({ ...form, process_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih Workstation…" /></SelectTrigger>
                <SelectContent>
                  {subProcesses.map(sp => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.lines?.name ? `${sp.lines.name} — ` : ""}{sp.code} · {sp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label>Jenis NG / Defect</Label>
            {dtLoading ? <div className="text-xs text-muted-foreground py-2">Memuat…</div> : (
              <Select value={form.defect_type_id} onValueChange={v => setForm({ ...form, defect_type_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih jenis NG…" /></SelectTrigger>
                <SelectContent>
                  {defectTypes.map(dt => (
                    <SelectItem key={dt.id} value={dt.id}>
                      {dt.category ? `[${dt.category}] ` : ""}{dt.name}{dt.product_id === null ? " 🌐" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label>Kuantitas NG</Label>
            <Input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} />
          </div>
          <div>
            <Label>Disposisi</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DISPOSITIONS.map(d => (
                <Button key={d.id} variant={form.disposition === d.id ? "default" : "outline"} size="sm"
                  onClick={() => setForm({ ...form, disposition: d.id })}>{d.label}</Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Keterangan (opsional)</Label>
            <Textarea placeholder="Detail tambahan…" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Menyimpan…</> : "✓ Tambah NG"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
