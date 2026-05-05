import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TimeInput } from "@/components/ui/time-input";
import { Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DowntimeData } from "./types";
import { useDowntimeCategories } from "./useShiftModalData";

interface DowntimeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DowntimeData) => Promise<void>;
}

export function DowntimeModal({ open, onOpenChange, onSubmit }: DowntimeModalProps) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Partial<DowntimeData>>({
    category_id: "", kind: "unplanned", start_time: "07:00", end_time: "07:35",
    root_cause: "", action_taken: "",
  });

  const { data: categories = [], isLoading: catLoading } = useDowntimeCategories();

  const duration = (() => {
    if (!form.start_time || !form.end_time) return 0;
    const [sh, sm] = form.start_time.split(":").map(Number);
    const [eh, em] = form.end_time.split(":").map(Number);
    let duration = (eh * 60 + em) - (sh * 60 + sm);
    // Handle overnight shifts (e.g., 23:00 - 01:00 = 120 minutes)
    if (duration < 0) duration += 24 * 60;
    return Math.max(0, duration);
  })();

  const handleSubmit = async () => {
    if (!form.category_id)        { toast.error("Kategori wajib dipilih"); return; }
    if (!form.root_cause?.trim()) { toast.error("Root cause wajib diisi"); return; }
    setBusy(true);
    try {
      await onSubmit({ ...form, duration } as DowntimeData);
      setForm({ category_id: "", kind: "unplanned", start_time: "07:00", end_time: "07:35", root_cause: "", action_taken: "" });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah downtime");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>⏸️ Catat Downtime</DialogTitle>
          <DialogDescription>Log planned atau unplanned downtime dengan kategori dan root cause</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tipe Downtime</Label>
            <ToggleGroup type="single" value={form.kind}
              onValueChange={v => v && setForm({ ...form, kind: v as "planned" | "unplanned" })}
              className="justify-start">
              <ToggleGroupItem value="planned">📅 Planned</ToggleGroupItem>
              <ToggleGroupItem value="unplanned">🚨 Unplanned</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div>
            <Label>Kategori</Label>
            {catLoading ? <div className="text-xs text-muted-foreground py-2">Memuat…</div> : (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {categories.map(cat => (
                  <Button key={cat.id}
                    variant={form.category_id === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setForm({ ...form, category_id: cat.id, kind: cat.is_planned ? "planned" : "unplanned" })}
                    className="justify-start text-left h-auto py-2">
                    {cat.name}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Waktu Mulai</Label>
              <TimeInput value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <Label>Waktu Selesai</Label>
              <TimeInput value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>

          {duration > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 font-medium">
                <Clock className="inline h-4 w-4 mr-1" />
                Durasi: <strong>{duration} menit</strong>
              </p>
            </div>
          )}

          <div>
            <Label>Root Cause</Label>
            <Textarea placeholder="Jelaskan penyebab downtime…" value={form.root_cause}
              onChange={e => setForm({ ...form, root_cause: e.target.value })} />
          </div>
          <div>
            <Label>Action Taken (opsional)</Label>
            <Textarea placeholder="Tindakan yang diambil…" value={form.action_taken}
              onChange={e => setForm({ ...form, action_taken: e.target.value })} />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Menyimpan…</> : "✓ Catat Downtime"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
