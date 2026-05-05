import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { downloadTemplate, parseCSV } from "@/lib/csv-utils";
import { toast } from "sonner";

export interface CsvButtonsProps {
  /** Filename for the downloaded template (e.g. "template-lines.csv") */
  templateFilename: string;
  /** Column headers that match the import handler's expected keys */
  templateHeaders: string[];
  /** One sample row — same order as templateHeaders */
  templateSample: (string | number | boolean)[];
  /** Called with parsed rows; return { imported, errors } */
  onImport: (rows: Record<string, string>[]) => Promise<{ imported: number; errors: string[] }>;
}

/**
 * Two small outline buttons: "⬇ Template" and "⬆ Import CSV".
 * Designed for use inside AdminSection's `rightSlot` prop.
 */
export function CsvButtons({
  templateFilename,
  templateHeaders,
  templateSample,
  onImport,
}: CsvButtonsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-import of same file
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) {
      toast.error("File CSV kosong atau format tidak dikenali");
      return;
    }
    setBusy(true);
    try {
      const { imported, errors } = await onImport(rows);
      if (!errors.length) {
        toast.success(`✓ ${imported} baris berhasil diimpor`);
      } else {
        toast.warning(
          `${imported} berhasil, ${errors.length} gagal — ${errors.slice(0, 2).join(" | ")}`,
        );
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Import gagal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs gap-1"
        onClick={() =>
          downloadTemplate(templateFilename, templateHeaders, templateSample)
        }
      >
        <Download className="h-3.5 w-3.5" /> Template
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs gap-1"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="h-3.5 w-3.5" />
        {busy ? "Mengimpor…" : "Import CSV"}
      </Button>
    </>
  );
}
