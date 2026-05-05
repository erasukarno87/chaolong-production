import { useEffect, useState } from "react";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUpsert } from "@/hooks/useCrud";

// --- Types -------------------------------------------------------------------
interface Skill {
  id: string; code: string; name: string;
  description: string | null; sort_order: number; active: boolean;
}

// --- Helpers -----------------------------------------------------------------
const emptyForm = (): Partial<Skill> => ({
  code: "", name: "", description: "", sort_order: 10, active: true,
});

// --- Props -------------------------------------------------------------------
interface SkillFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editSkill: Skill | null; // null = add mode
}

// --- Component ---------------------------------------------------------------
export function SkillFormModal({ open, onOpenChange, editSkill }: SkillFormModalProps) {
  const upsert = useUpsert("skills");

  const [form,   setForm]   = useState<Partial<Skill>>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form state whenever the modal opens or editSkill changes
  useEffect(() => {
    if (open) {
      setForm(editSkill ? { ...editSkill } : emptyForm());
      setErrors({});
    }
  }, [open, editSkill]);

  const clearErr = (f: string) => setErrors(e => { const n = { ...e }; delete n[f]; return n; });
  const errCls   = (f: string) => errors[f] ? "border-destructive focus-visible:ring-destructive" : "";

  const handleSubmit = async () => {
    const newErr: Record<string, string> = {};
    if (!form.code?.trim()) newErr.code = "Kode wajib diisi";
    if (!form.name?.trim()) newErr.name = "Nama Skill wajib diisi";
    if (Object.keys(newErr).length > 0) { setErrors(newErr); return; }
    await upsert.mutateAsync(form);
    onOpenChange(false);
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={form.id ? "Edit Skill" : "Tambah Skill"}
      onSubmit={handleSubmit}
      busy={upsert.isPending}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Kode <span className="text-destructive">*</span></Label>
          <Input
            value={form.code ?? ""}
            placeholder="SKL-01"
            className={errCls("code")}
            onChange={e => { clearErr("code"); setForm(f => ({ ...f, code: e.target.value.toUpperCase() })); }}
          />
          {errors.code && <p className="text-[11px] text-destructive">{errors.code}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Urutan Tampil</Label>
          <Input
            type="number" min={0}
            value={form.sort_order ?? 0}
            onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Nama Skill <span className="text-destructive">*</span></Label>
        <Input
          value={form.name ?? ""}
          placeholder="Nama skill…"
          className={errCls("name")}
          onChange={e => { clearErr("name"); setForm(f => ({ ...f, name: e.target.value })); }}
        />
        {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Deskripsi</Label>
        <Input
          value={form.description ?? ""}
          placeholder="Opsional…"
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>Aktif</Label>
        <Switch
          checked={form.active ?? true}
          onCheckedChange={v => setForm(f => ({ ...f, active: v }))}
        />
      </div>
    </FormModal>
  );
}
