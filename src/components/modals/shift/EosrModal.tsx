import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { SignatureCapture } from "@/components/digital-signature/SignatureCapture";

interface EosrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift_run_id: string;
  initialNotes?: string;
  initialSignature?: string | null;
  summary: {
    actual_output: number;
    target_output: number;
    total_ng: number;
    total_downtime: number;
    oee: number;
  };
  onSubmit: (notes?: string, signatureDataUrl?: string) => Promise<void>;
}

const METRIC_TONE: Record<string, string> = {
  green:  "text-green-600",
  red:    "text-red-600",
  orange: "text-orange-600",
  blue:   "text-primary",
};

export function EosrModal({ 
  open, 
  onOpenChange, 
  summary, 
  onSubmit, 
  initialNotes,
  initialSignature,
}: EosrModalProps) {
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [signature, setSignature] = useState<string | null>(initialSignature ?? null);

  useEffect(() => { 
    if (open) {
      setNotes(initialNotes ?? "");
      setSignature(initialSignature ?? null);
    }
  }, [open, initialNotes, initialSignature]);

  const achievement = ((summary.actual_output / (summary.target_output || 1)) * 100).toFixed(1);
  const ng_ratio    = ((summary.total_ng / ((summary.actual_output + summary.total_ng) || 1)) * 100).toFixed(2);

  const handleSubmit = async () => {
    setBusy(true);
    try {
      await onSubmit(notes.trim() || undefined, signature ?? undefined);
      setNotes("");
      setSignature(null);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal submit EOSR");
    } finally { setBusy(false); }
  };

  const metrics = [
    { label: "Output Actual",   value: String(summary.actual_output),      unit: "unit",                   tone: "blue"   },
    { label: "Target",          value: String(summary.target_output),       unit: "unit",                   tone: "slate"  },
    { label: "Achievement Rate",value: `${achievement}%`,                   unit: "",                       tone: parseFloat(achievement) >= 90 ? "green" : "orange" },
    { label: "OEE Estimate",    value: `${summary.oee.toFixed(1)}%`,        unit: "",                       tone: summary.oee >= 80 ? "green" : "orange" },
    { label: "Total NG",        value: String(summary.total_ng),            unit: `NG Ratio ${ng_ratio}%`,  tone: "red"    },
    { label: "Total Downtime",  value: String(summary.total_downtime),      unit: "menit",                  tone: "orange" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>📈 End-of-Shift Report (EOSR)</DialogTitle>
          <DialogDescription>Summary shift & verifikasi leader untuk lock shift run</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="verify">Verifikasi</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {metrics.map(({ label, value, unit, tone }) => (
                <Card key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-bold ${METRIC_TONE[tone] ?? ""}`}>{value}</p>
                  {unit && <p className="text-xs text-muted-foreground">{unit}</p>}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="verify" className="space-y-4 mt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-amber-900">Verifikasi Shift Run</p>
                <p className="text-xs text-amber-800 mt-1">
                  Setelah submit, shift run akan di-lock dan tidak bisa diedit.
                </p>
              </div>
            </div>

            {/* Signature Section */}
            <div className="space-y-2">
              <Label htmlFor="signature">Tanda Tangan Leader (Opsional)</Label>
              <div id="signature">
                <SignatureCapture
                  width={350}
                  height={120}
                  initialValue={signature}
                  onCapture={(dataUrl) => setSignature(dataUrl)}
                  onClear={() => setSignature(null)}
                />
              </div>
              {signature && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Tanda tangan captured - siap untuk submit
                </p>
              )}
            </div>

            <div>
              <Label>Catatan Akhir Shift (opsional)</Label>
              <Textarea className="mt-2" rows={3}
                placeholder="Kendala, tindak lanjut, atau pesan untuk shift berikutnya…"
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <Card className="p-3 bg-green-50 border-green-200 space-y-1">
              <p className="text-xs font-semibold text-green-900">Checklist Pre-Submit:</p>
              {["Semua hourly output sudah dicatat","NG entries lengkap dengan disposisi","Downtime dicatat dengan root cause","Leader siap sign-off shift run"].map(item => (
                <p key={item} className="text-xs text-green-800">✓ {item}</p>
              ))}
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 justify-end mt-6 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={busy} 
            className="gap-2"
            title={signature ? "EOSR akan ditandatangani" : "Submit tanpa tanda tangan"}
          >
            {busy ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</>
            ) : signature ? (
              <><CheckCircle className="h-4 w-4" />Submit EOSR & Sign</>
            ) : (
              "✓ Submit EOSR & Lock Shift"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
