import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ShiftSetupData } from "./types";
import { useModalLines, useModalShifts, useModalProducts, useOperatorsRoster } from "./useShiftModalData";

type SetupWizardStep = 1 | 2 | 3 | 4;

interface SetupWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ShiftSetupData) => Promise<void>;
}

const EMPTY_SETUP: Partial<ShiftSetupData> = {
  line_id: "", shift_id: "", product_id: "", target_quantity: 1200,
  hourly_target: 150, leader_user_id: "", operator_ids: [], checklist_completed: false, notes: "",
};

export function ShiftSetupWizardModal({ open, onOpenChange, onSubmit }: SetupWizardModalProps) {
  const [step, setStep] = useState<SetupWizardStep>(1);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Partial<ShiftSetupData>>(EMPTY_SETUP);

  const { data: lines = [],    isLoading: linesLoading    } = useModalLines();
  const { data: shifts = [],   isLoading: shiftsLoading   } = useModalShifts();
  const { data: products = [], isLoading: productsLoading } = useModalProducts();
  const { data: operators = [], isLoading: opsLoading     } = useOperatorsRoster();

  const isLoading = linesLoading || shiftsLoading || productsLoading || opsLoading;

  if (lines.length    && !form.line_id)    setForm(f => ({ ...f, line_id: lines[0].id }));
  if (shifts.length   && !form.shift_id)   setForm(f => ({ ...f, shift_id: shifts[0].id }));
  if (products.length && !form.product_id) setForm(f => ({ ...f, product_id: products[0].id }));

  const handleSubmit = async () => {
    if (!form.leader_user_id)       { toast.error("Leader wajib dipilih"); return; }
    if (!form.operator_ids?.length) { toast.error("Minimal 1 operator harus dipilih"); return; }
    if (!form.checklist_completed)  { toast.error("Checklist produksi harus diselesaikan"); return; }
    setBusy(true);
    try {
      await onSubmit(form as ShiftSetupData);
      setStep(1); setForm(EMPTY_SETUP); onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat setup");
    } finally { setBusy(false); }
  };

  const selectedLine    = lines.find(l => l.id === form.line_id);
  const selectedShift   = shifts.find(s => s.id === form.shift_id);
  const selectedProduct = products.find(p => p.id === form.product_id);
  const selectedLeader  = operators.find(o => o.id === form.leader_user_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>🚀 Setup Shift Produksi Baru</DialogTitle>
          <DialogDescription>Langkah {step}/4: {["Info Dasar", "Checklist", "Penugasan", "Konfirmasi"][step - 1]}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`flex-1 h-2 rounded-full transition ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Memuat data master…</span>
          </div>
        ) : (
          <div className="space-y-4 min-h-64">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>Lini Produksi</Label>
                  <Select value={form.line_id} onValueChange={v => setForm({ ...form, line_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih lini…" /></SelectTrigger>
                    <SelectContent>{lines.map(l => <SelectItem key={l.id} value={l.id}>{l.code} — {l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Shift</Label>
                  <Select value={form.shift_id} onValueChange={v => setForm({ ...form, shift_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih shift…" /></SelectTrigger>
                    <SelectContent>{shifts.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Produk</Label>
                  <Select value={form.product_id} onValueChange={v => setForm({ ...form, product_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih produk…" /></SelectTrigger>
                    <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}{p.model ? ` (${p.model})` : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Qty (unit)</Label>
                    <Input type="number" value={form.target_quantity} onChange={e => setForm({ ...form, target_quantity: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label>Hourly Target (unit/jam)</Label>
                    <Input type="number" value={form.hourly_target} onChange={e => setForm({ ...form, hourly_target: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-medium">Verifikasi checklist pre-produksi:</p>
                <Card className="p-4 space-y-3">
                  {[
                    { id: "5s",       label: "5S & Kebersihan",      desc: "Area bersih, tidak ada material sisa, marking sesuai standar" },
                    { id: "machine",  label: "Mesin & Fixture",       desc: "Fixture dikalibrasi, parameter sesuai, no warning" },
                    { id: "material", label: "Material",              desc: "Material tersedia, lot & tanggal dicek, label ready" },
                    { id: "safety",   label: "Safety & Dokumen",      desc: "APD lengkap, W/I terpasang, briefing selesai" },
                  ].map(item => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <Checkbox id={`check-${item.id}`} checked={form.checklist_completed}
                        onCheckedChange={v => setForm({ ...form, checklist_completed: v as boolean })} />
                      <label htmlFor={`check-${item.id}`} className="text-sm cursor-pointer flex-1">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground text-xs block">{item.desc}</span>
                      </label>
                    </div>
                  ))}
                </Card>
                <div>
                  <Label>Catatan (opsional)</Label>
                  <Textarea placeholder="Catat kondisi khusus atau rekomendasi..." value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label>Production Leader</Label>
                  <Select value={form.leader_user_id} onValueChange={v => setForm({ ...form, leader_user_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih leader…" /></SelectTrigger>
                    <SelectContent>
                      {operators.filter(o => o.role === "leader" || o.role === "super_admin").map(op => (
                        <SelectItem key={op.id} value={op.id}>{op.full_name}{op.employee_code ? ` (${op.employee_code})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Operator Produksi (minimal 1)</Label>
                  <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                    {operators.filter(o => o.role === "operator").map(op => (
                      <div key={op.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted">
                        <Checkbox id={`op-${op.id}`} checked={form.operator_ids?.includes(op.id) ?? false}
                          onCheckedChange={v => setForm({
                            ...form,
                            operator_ids: v ? [...(form.operator_ids ?? []), op.id] : (form.operator_ids ?? []).filter(id => id !== op.id),
                          })} />
                        <label htmlFor={`op-${op.id}`} className="text-sm cursor-pointer flex-1">
                          {op.full_name}{op.employee_code ? ` · ${op.employee_code}` : ""}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <Card className="p-4 space-y-3">
                  {[
                    ["Lini",     selectedLine?.name ?? "—"],
                    ["Shift",    selectedShift ? `${selectedShift.name} (${selectedShift.start_time}–${selectedShift.end_time})` : "—"],
                    ["Produk",   selectedProduct ? `${selectedProduct.code} — ${selectedProduct.name}` : "—"],
                    ["Target",   `${form.target_quantity} unit / ${form.hourly_target} pcs/jam`],
                    ["Leader",   selectedLeader?.full_name ?? "—"],
                    ["Operator", `${form.operator_ids?.length ?? 0} operator dipilih`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}:</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </Card>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Setup siap dikonfirmasi. Shift run akan dimulai.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-between mt-6 border-t pt-4">
          <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1) as SetupWizardStep)} disabled={step === 1}>
            ← Sebelumnya
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            {step < 4 ? (
              <Button onClick={() => setStep(s => Math.min(4, s + 1) as SetupWizardStep)} className="gap-2">
                Lanjut <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={busy} className="gap-2">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : "✓ Konfirmasi & Mulai"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
