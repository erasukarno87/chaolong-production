import { useState, useMemo } from "react";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Camera, Loader2, Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Operator, Line, Process, OpLineAssignment, OpProcAssignment, FormTab } from "./types";
import { COLORS as COLOR_LIST } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table) as any;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editOperator: Operator | null;
  lines: Line[];
  procs: Process[];
  supervisorOptions: Operator[];
  existingLineAsgn: OpLineAssignment[];
  existingProcAsgn: OpProcAssignment[];
  onSuccess: () => void;
}

export function OperatorFormModal({
  open, onOpenChange, editOperator,
  lines, procs, supervisorOptions,
  existingLineAsgn, existingProcAsgn,
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const isEdit = !!editOperator;

  const [activeTab, setActiveTab] = useState<FormTab>("identity");
  const [busy, setBusy] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Operator>>({
    full_name: "", employee_code: "", role: "supervisor",
    initials: "", avatar_color: "#1A6EFA", active: true,
    join_date: null, position: null, supervisor_id: null,
  });

  const [lineAsgn, setLineAsgn] = useState<{ line_id: string; is_default: boolean }[]>([]);
  const [procAsgn, setProcAsgn] = useState<{ process_id: string; is_default: boolean }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearErr = (field: string) => setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  const setErr   = (field: string, msg: string) => setErrors(e => ({ ...e, [field]: msg }));
  const errCls   = (field: string) => errors[field] ? "border-destructive focus-visible:ring-destructive" : "";

  // Sync form state when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) {
      if (editOperator) {
        setForm({ ...editOperator });
        setLineAsgn(existingLineAsgn.filter(a => a.operator_id === editOperator.id).map(a => ({ line_id: a.line_id, is_default: a.is_default })));
        setProcAsgn(existingProcAsgn.filter(a => a.operator_id === editOperator.id).map(a => ({ process_id: a.process_id, is_default: a.is_default })));
      } else {
        setForm({ full_name: "", employee_code: "", role: "supervisor", initials: "", avatar_color: "#1A6EFA", active: true, join_date: null, position: null, supervisor_id: null });
        setLineAsgn([]); setProcAsgn([]);
      }
      setActiveTab("identity"); setPreviewUrl(null); setErrors({});
    } else {
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    }
    onOpenChange(v);
  };

  // ── Line toggle helpers ──────────────────────────────────────────────────────
  const toggleLine = (lineId: string) => {
    setLineAsgn(prev => {
      const exists = prev.some(a => a.line_id === lineId);
      if (exists) {
        const next = prev.filter(a => a.line_id !== lineId);
        if (next.length > 0 && !next.some(a => a.is_default))
          return next.map((a, i) => ({ ...a, is_default: i === 0 }));
        return next;
      }
      return [...prev, { line_id: lineId, is_default: prev.length === 0 }];
    });
  };
  const setDefaultLine = (lineId: string) =>
    setLineAsgn(prev => prev.map(a => ({ ...a, is_default: a.line_id === lineId })));

  // ── POS toggle helpers ───────────────────────────────────────────────────────
  const toggleProc = (procId: string) => {
    setProcAsgn(prev => {
      const exists = prev.some(a => a.process_id === procId);
      if (exists) return prev.filter(a => a.process_id !== procId);
      return [...prev, { process_id: procId, is_default: prev.length === 0 }];
    });
  };
  const setDefaultProc = (procId: string) =>
    setProcAsgn(prev => prev.map(a =>
      a.process_id === procId ? { ...a, is_default: !a.is_default } : a
    ));

  const selectedLineIds  = lineAsgn.map(a => a.line_id);
  const assignableProcs  = useMemo(
    () => procs.filter(p => p.line_id && selectedLineIds.includes(p.line_id)),
    [procs, selectedLineIds],
  );

  // ── Photo upload ─────────────────────────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Ukuran foto maksimal 5 MB"); return; }
    const blobUrl = URL.createObjectURL(file);
    setPreviewUrl(blobUrl);
    setUploadingPhoto(true);
    try {
      const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("operator-photos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("operator-photos").getPublicUrl(path);
      setForm(f => ({ ...f, photo_url: publicUrl }));
      toast.success("Foto berhasil diupload");
    } catch (e: unknown) {
      setPreviewUrl(null); URL.revokeObjectURL(blobUrl);
      toast.error("Gagal upload foto: " + (e instanceof Error ? e.message : String(e)));
    } finally { setUploadingPhoto(false); e.target.value = ""; }
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const submit = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.full_name?.trim())     newErrors.full_name     = "Nama lengkap wajib diisi";
    if (!form.employee_code?.trim()) newErrors.employee_code = "Kode Pegawai wajib diisi";
    if (!form.position)              newErrors.position      = "Jabatan wajib dipilih";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); setActiveTab("identity"); return; }

    setBusy(true);
    try {
      const basePayload = {
        full_name: form.full_name!.trim(), employee_code: form.employee_code!.trim() || null,
        role: form.role ?? "supervisor", initials: form.initials?.trim() || null,
        avatar_color: form.avatar_color || null, active: form.active ?? true,
        join_date: form.join_date || null, photo_url: form.photo_url || null,
        position: form.position || null, supervisor_id: form.supervisor_id || null,
      };
      let operatorId: string;
      if (form.id) {
        const { error: ue } = await db("operators").update(basePayload).eq("id", form.id);
        if (ue) throw ue;
        operatorId = form.id;
      } else {
        const { data: inserted, error: ie } = await db("operators").insert(basePayload).select("id").single();
        if (ie) {
          if (ie.code === "23505") { setErr("employee_code", `Kode "${form.employee_code}" sudah digunakan`); setActiveTab("identity"); return; }
          throw ie;
        }
        operatorId = inserted.id;
      }

      const nextLineIds = lineAsgn.map(a => a.line_id);
      if (lineAsgn.length > 0) {
        const { error: le } = await db("operator_line_assignments")
          .upsert(
            lineAsgn.map(a => ({ operator_id: operatorId, line_id: a.line_id, is_default: a.is_default })),
            { onConflict: "operator_id,line_id" },
          );
        if (le) throw le;
      }
      const deleteLinesQuery = db("operator_line_assignments").delete().eq("operator_id", operatorId);
      const { error: delLe } = nextLineIds.length > 0
        ? await deleteLinesQuery.not("line_id", "in", `(${nextLineIds.join(",")})`)
        : await deleteLinesQuery;
      if (delLe) throw delLe;

      const nextProcIds = procAsgn.map(a => a.process_id);
      if (procAsgn.length > 0) {
        const { error: pe } = await db("operator_process_assignments")
          .upsert(
            procAsgn.map(a => ({ operator_id: operatorId, process_id: a.process_id, is_default: a.is_default })),
            { onConflict: "operator_id,process_id" },
          );
        if (pe) throw pe;
      }
      const deleteProcsQuery = db("operator_process_assignments").delete().eq("operator_id", operatorId);
      const { error: delPe } = nextProcIds.length > 0
        ? await deleteProcsQuery.not("process_id", "in", `(${nextProcIds.join(",")})`)
        : await deleteProcsQuery;
      if (delPe) throw delPe;
      qc.invalidateQueries({ queryKey: ["table", "operators_public"] });
      qc.invalidateQueries({ queryKey: ["table", "operator_line_assignments"] });
      qc.invalidateQueries({ queryKey: ["table", "operator_process_assignments"] });
      toast.success(isEdit ? "Operator diperbarui" : "Operator ditambahkan");
      onSuccess(); onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally { setBusy(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <FormModal
      open={open} onOpenChange={handleOpenChange} size="2xl"
      title={isEdit ? `Edit — ${form.full_name}` : "Tambah Operator"}
      onSubmit={submit} busy={busy}
    >
      {/* Tab bar */}
      <div className="flex gap-1 border-b -mx-1 mb-1 pb-0">
        {([["identity", "Identitas"], ["placement", "Penempatan Line & Workstation"]] as [FormTab, string][]).map(([tab, label]) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>{label}</button>
        ))}
      </div>

      {/* ── Tab 1: Identitas ── */}
      {activeTab === "identity" && (
        <div className="space-y-3.5 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nama Lengkap <span className="text-destructive">*</span></Label>
              <Input value={form.full_name ?? ""} placeholder="Budi Santoso" className={errCls("full_name")}
                onChange={e => {
                  const name = e.target.value;
                  clearErr("full_name");
                  setForm(f => ({
                    ...f, full_name: name,
                    initials: f.initials?.trim() ? f.initials : name.split(/\s+/).filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 3),
                  }));
                }} />
              {errors.full_name && <p className="text-[11px] text-destructive">{errors.full_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Kode Pegawai <span className="text-destructive">*</span></Label>
              <Input value={form.employee_code ?? ""} placeholder="EMP-001" className={errCls("employee_code")}
                onChange={e => { clearErr("employee_code"); setForm(f => ({ ...f, employee_code: e.target.value.toUpperCase() })); }} />
              {errors.employee_code && <p className="text-[11px] text-destructive">{errors.employee_code}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Jabatan / Posisi <span className="text-destructive">*</span></Label>
              <select className={`w-full h-10 rounded-md border bg-background px-3 text-sm ${errors.position ? "border-destructive" : ""}`}
                value={form.position ?? ""} onChange={e => { clearErr("position"); setForm(f => ({ ...f, position: e.target.value || null })); }}>
                <option value="">— Pilih jabatan —</option>
                <option value="Operator Process">Operator Process</option>
                <option value="Inspector Quality">Inspector Quality</option>
              </select>
              {errors.position && <p className="text-[11px] text-destructive">{errors.position}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Bergabung</Label>
              <DateInput value={form.join_date ?? ""} onChange={e => setForm(f => ({ ...f, join_date: e.target.value || null }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Atasan Langsung</Label>
            <select className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={form.supervisor_id ?? ""} onChange={e => setForm(f => ({ ...f, supervisor_id: e.target.value || null }))}>
              <option value="">— Tidak ada / Tidak dipilih —</option>
              {supervisorOptions.map(o => (
                <option key={o.id} value={o.id}>{o.full_name} ({o.position ?? o.role})</option>
              ))}
            </select>
          </div>

          {/* Photo upload */}
          <div className="flex items-center gap-4 rounded-lg border p-3">
            <div className="shrink-0">
              {(previewUrl || form.photo_url) ? (
                <div className="relative h-16 w-16">
                  <img src={previewUrl || form.photo_url!} alt="Foto" className="h-16 w-16 rounded-lg object-cover border" />
                  <button type="button"
                    onClick={() => { if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } setForm(f => ({ ...f, photo_url: null })); }}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-16 rounded-lg border-2 border-dashed flex items-center justify-center"
                  style={{ background: form.avatar_color ? form.avatar_color + "22" : "hsl(var(--muted))" }}>
                  <Camera className="h-6 w-6 text-muted-foreground/50" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium mb-1">Foto Operator</p>
              <p className="text-[11px] text-muted-foreground mb-2">JPG/PNG/WEBP · Maks 5 MB</p>
              <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border cursor-pointer transition-colors
                ${uploadingPhoto ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}>
                {uploadingPhoto ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengupload…</> : <><Camera className="h-3.5 w-3.5" /> {form.photo_url ? "Ganti Foto" : "Upload Foto"}</>}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadingPhoto} onChange={handlePhotoUpload} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Inisial</Label>
              <Input maxLength={3} value={form.initials ?? ""} placeholder="BS"
                onChange={e => setForm(f => ({ ...f, initials: e.target.value.toUpperCase() }))} />
              <p className="text-[11px] text-muted-foreground">Maks 3 huruf — otomatis dari nama jika kosong</p>
            </div>
            <div className="space-y-1.5">
              <Label>Warna Avatar</Label>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {COLOR_LIST.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, avatar_color: c }))}
                    className={`h-7 w-7 rounded-md transition-all ${form.avatar_color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <Label className="m-0">Status Aktif</Label>
              <p className="text-[11px] text-muted-foreground">Operator non-aktif tidak bisa digunakan</p>
            </div>
            <Switch checked={form.active ?? true} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
          </div>
        </div>
      )}

      {/* ── Tab 2: Penempatan LINE & POS ── */}
      {activeTab === "placement" && (
        <div className="space-y-5 pt-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="m-0">Lini Produksi Ditugaskan</Label>
              <span className="text-[10px] text-muted-foreground">★ = Default</span>
            </div>
            {lines.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada lini terdaftar.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {lines.map(l => {
                  const asgn = lineAsgn.find(a => a.line_id === l.id);
                  const on   = !!asgn;
                  return (
                    <div key={l.id} className="flex items-center gap-0.5">
                      <button type="button" onClick={() => toggleLine(l.id)}
                        className={`px-3 py-1.5 rounded-l-lg text-xs border font-medium transition-all ${
                          on ? "bg-primary/10 border-primary text-primary" : "bg-background hover:bg-accent border-border text-muted-foreground"
                        }`}>{l.name}</button>
                      {on && (
                        <button type="button" onClick={() => setDefaultLine(l.id)} title="Set sebagai default"
                          className={`h-full px-1.5 py-1.5 rounded-r-lg border-y border-r text-xs transition-colors ${
                            asgn.is_default ? "bg-amber-400/20 border-amber-400 text-amber-500" : "bg-background border-border text-muted-foreground/40 hover:text-amber-400"
                          }`}>
                          <Star className={`h-3 w-3 ${asgn.is_default ? "fill-amber-400" : ""}`} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {lineAsgn.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Default: <strong>{lines.find(l => l.id === lineAsgn.find(a => a.is_default)?.line_id)?.name ?? "—"}</strong>
                {" · "}Alternatif: {lineAsgn.filter(a => !a.is_default).map(a => lines.find(l => l.id === a.line_id)?.name).filter(Boolean).join(", ") || "—"}
              </p>
            )}
          </div>

          <div className="border-t" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="m-0">Workstation Ditugaskan</Label>
              <span className="text-[10px] text-muted-foreground">★ = Default</span>
            </div>
            {selectedLineIds.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-lg border-2 border-dashed p-3 text-center">
                Pilih lini dulu di bagian atas untuk melihat daftar Workstation.
              </p>
            ) : assignableProcs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Tidak ada Workstation untuk lini yang dipilih.</p>
            ) : (
              <div className="space-y-2">
                {lines.filter(l => selectedLineIds.includes(l.id)).map(l => {
                  const lProcs = assignableProcs.filter(p => p.line_id === l.id);
                  if (lProcs.length === 0) return null;
                  return (
                    <div key={l.id}>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{l.name}</div>
                      <div className="flex flex-wrap gap-2">
                        {lProcs.map(p => {
                          const asgn = procAsgn.find(a => a.process_id === p.id);
                          const on   = !!asgn;
                          return (
                            <div key={p.id} className="flex items-center gap-0.5">
                              <button type="button" onClick={() => toggleProc(p.id)}
                                className={`px-3 py-1.5 rounded-l-lg text-xs border font-medium transition-all ${
                                  on ? "bg-primary/10 border-primary text-primary" : "bg-background hover:bg-accent border-border text-muted-foreground"
                                }`}><span>{p.name}</span></button>
                              {on && (
                                <button type="button" onClick={() => setDefaultProc(p.id)}
                                  title={asgn.is_default ? "Hapus dari default" : "Tandai sebagai default"}
                                  className={`h-full px-1.5 py-1.5 rounded-r-lg border-y border-r text-xs transition-colors ${
                                    asgn.is_default ? "bg-amber-400/20 border-amber-400 text-amber-500" : "bg-background border-border text-muted-foreground/40 hover:text-amber-400"
                                  }`}>
                                  <Star className={`h-3 w-3 ${asgn.is_default ? "fill-amber-400" : ""}`} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {procAsgn.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Default (★):{" "}
                <span className="font-semibold">
                  {procAsgn.filter(a => a.is_default).map(a => procs.find(p => p.id === a.process_id)?.name).filter(Boolean).join(", ") || "—"}
                </span>
                {" · "}Total ditugaskan: {procAsgn.length}
              </p>
            )}
          </div>
        </div>
      )}
    </FormModal>
  );
}
