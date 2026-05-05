/**
 * AutonomousCheckItemFormModal — form tambah / edit item check autonomous.
 *
 * Extracted from AutonomousTab.tsx.
 * Handles all form state, validation, and image upload internally.
 */
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { useUpsert } from "@/hooks/useCrud";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckItem {
  id: string;
  line_id: string;
  process_id: string | null;
  code: string;
  name: string;
  category: string | null;
  frequency: string;
  standard: string | null;
  method: string | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
}

export interface Line {
  id: string;
  code: string;
  name: string;
}

export interface Process {
  id: string;
  line_id: string | null;
  code: string;
  name: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: CheckItem | null;
  lines: Line[];
  processes: Process[];
  allCategories: string[];
  allFrequencies: string[];
  onSuccess: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCodePrefix(lineCode: string): string {
  const parts = lineCode.split("-");
  const lastPart = parts[parts.length - 1];
  const trimmed =
    parts.length > 1 && lastPart.length === 1 ? parts.slice(0, -1) : parts;
  return `AM-${trimmed.join("-")}`;
}

const emptyForm = (
  defaultLineId?: string,
  defaultFreq?: string,
  autoCode?: string,
): Partial<CheckItem> => ({
  line_id: defaultLineId ?? "",
  process_id: null,
  code: autoCode ?? "",
  name: "",
  category: "",
  frequency: defaultFreq ?? "",
  standard: "",
  method: "",
  image_url: null,
  sort_order: 0,
  active: true,
});

// ─── Component ────────────────────────────────────────────────────────────────

export function AutonomousCheckItemFormModal({
  open,
  onOpenChange,
  editItem,
  lines,
  processes,
  allCategories,
  allFrequencies,
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const upsert = useUpsert("autonomous_check_items");

  const [form, setForm] = useState<Partial<CheckItem>>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Image upload state ──
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearErr = (f: string) =>
    setErrors((e) => {
      const n = { ...e };
      delete n[f];
      return n;
    });
  const errCls = (f: string) =>
    errors[f] ? "border-destructive focus-visible:ring-destructive" : "";

  // ── Sync form state when modal opens or editItem changes ──
  useEffect(() => {
    if (!open) return;
    if (editItem) {
      setPreviewUrl(editItem.image_url ?? null);
      setForm({ ...editItem });
    } else {
      // new item — pick sensible defaults
      const firstLine = lines[0];
      const autoCode = firstLine ? generateCodePrefix(firstLine.code) : "";
      setPreviewUrl(null);
      setForm(emptyForm(firstLine?.id ?? "", allFrequencies[0] ?? "", autoCode));
    }
    setErrors({});
  }, [open, editItem]); // eslint-disable-line react-hooks/exhaustive-deps

  // Workstation for the currently selected line
  const lineProcesses = processes.filter((p) => p.line_id === form.line_id);

  // ── Image upload ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5 MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    setPreviewUrl(blobUrl);
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("autonomous-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from("autonomous-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: publicUrl }));
      toast.success("Gambar berhasil diupload");
    } catch (e: unknown) {
      setPreviewUrl(null);
      URL.revokeObjectURL(blobUrl);
      toast.error(
        "Gagal upload: " + (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const removeImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setForm((f) => ({ ...f, image_url: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Revoke blob URL when modal closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onOpenChange(isOpen);
  };

  // ── Save ──
  const handleSave = async () => {
    const newErr: Record<string, string> = {};
    if (!form.line_id) newErr.line_id = "Pilih Line terlebih dahulu";
    if (!form.code?.trim()) newErr.code = "Kode wajib diisi";
    if (!form.name?.trim()) newErr.name = "Nama item wajib diisi";
    if (Object.keys(newErr).length > 0) {
      setErrors(newErr);
      return;
    }
    await upsert.mutateAsync({
      ...form,
      code: form.code!.toUpperCase().trim(),
      name: form.name!.trim(),
      category: form.category?.trim() || null,
      standard: form.standard?.trim() || null,
      method: form.method?.trim() || null,
      process_id: form.process_id || null,
      image_url: form.image_url || null,
      sort_order: form.sort_order ?? 0,
    });
    qc.invalidateQueries({ queryKey: ["autonomous-check-items"] });
    onOpenChange(false);
    onSuccess();
  };

  return (
    <FormModal
      open={open}
      onOpenChange={handleOpenChange}
      size="xl"
      title={form.id ? "Edit Item Check" : "Tambah Item Check"}
      onSubmit={handleSave}
      busy={upsert.isPending}
    >
      {/* Row 1: Line + Code + Name */}
      <div className="grid grid-cols-[180px_140px_1fr] gap-3">
        <div className="space-y-1.5">
          <Label>
            Lini <span className="text-destructive">*</span>
          </Label>
          <select
            className={`w-full h-10 rounded-md border bg-background px-3 text-sm ${errCls("line_id")}`}
            value={form.line_id ?? ""}
            onChange={(e) => {
              clearErr("line_id");
              setForm((f) => ({ ...f, line_id: e.target.value }));
            }}
          >
            <option value="">— Pilih Lini —</option>
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} — {l.name}
              </option>
            ))}
          </select>
          {errors.line_id && (
            <p className="text-[11px] text-destructive">{errors.line_id}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>
            Kode <span className="text-destructive">*</span>
          </Label>
          <Input
            value={form.code ?? ""}
            placeholder="AM-001"
            className={errCls("code")}
            onChange={(e) => {
              clearErr("code");
              setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }));
            }}
          />
          {errors.code && (
            <p className="text-[11px] text-destructive">{errors.code}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>
            Nama Item <span className="text-destructive">*</span>
          </Label>
          <Input
            value={form.name ?? ""}
            placeholder="Cek Oli Mesin, Bersihkan Filter, …"
            className={errCls("name")}
            onChange={(e) => {
              clearErr("name");
              setForm((f) => ({ ...f, name: e.target.value }));
            }}
          />
          {errors.name && (
            <p className="text-[11px] text-destructive">{errors.name}</p>
          )}
        </div>
      </div>

      {/* Row 2: Workstation + Kategori + Frekuensi */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>
            Workstation{" "}
            <span className="text-muted-foreground font-normal">(opsional)</span>
          </Label>
          <select
            className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            value={form.process_id ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, process_id: e.target.value || null }))
            }
          >
            <option value="">— Umum (semua WS) —</option>
            {lineProcesses.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Kategori</Label>
          <Input
            list="auto-cats-list"
            value={form.category ?? ""}
            placeholder="Pilih atau ketik…"
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <datalist id="auto-cats-list">
            {allCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <Label>Frekuensi</Label>
          <Input
            list="auto-freqs-list"
            value={form.frequency ?? ""}
            placeholder="Pilih atau ketik…"
            onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
          />
          <datalist id="auto-freqs-list">
            {allFrequencies.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Row 3: Standar + Metode */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Standar / Target</Label>
          <Input
            value={form.standard ?? ""}
            placeholder="Contoh: Min 80%, Tidak ada kebocoran"
            onChange={(e) => setForm((f) => ({ ...f, standard: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Metode Pengecekan</Label>
          <Input
            value={form.method ?? ""}
            placeholder="Visual, Sentuh, Ukur, …"
            onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
          />
        </div>
      </div>

      {/* Row 4: Gambar Referensi */}
      <div className="space-y-1.5">
        <Label>
          Gambar Referensi{" "}
          <span className="text-muted-foreground font-normal">(opsional)</span>
        </Label>
        {previewUrl ? (
          <div className="flex items-start gap-3">
            <img
              src={previewUrl}
              alt="Preview"
              className="h-24 w-24 object-cover rounded-lg border"
            />
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground mb-2">
                Gambar berhasil diupload
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 text-destructive hover:bg-destructive/10"
                onClick={removeImage}
              >
                <X className="h-3.5 w-3.5" /> Hapus Gambar
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <label
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed text-sm cursor-pointer transition-colors
              ${uploadingImage ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}
            >
              {uploadingImage ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Mengupload…
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />{" "}
                  <Upload className="h-3.5 w-3.5 text-muted-foreground" /> Pilih
                  gambar (JPG/PNG · maks 5 MB)
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploadingImage}
                onChange={handleImageUpload}
              />
            </label>
          </div>
        )}
      </div>

      {/* Row 5: Urutan + Aktif */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Urutan Tampil</Label>
          <Input
            type="number"
            min={0}
            value={form.sort_order ?? 0}
            onChange={(e) =>
              setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))
            }
          />
        </div>
        <div className="flex items-end justify-between pb-0.5">
          <Label>Aktif</Label>
          <Switch
            checked={form.active ?? true}
            onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
          />
        </div>
      </div>
    </FormModal>
  );
}
