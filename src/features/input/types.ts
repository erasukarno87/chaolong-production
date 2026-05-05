/**
 * Types and constants for the Input Laporan (Shift Setup) feature.
 */

// ─── Tab / Step Enums ─────────────────────────────────────────────────────────

export type ShiftTab =
  | "setup"
  | "first_check"
  | "output"
  | "ng"
  | "downtime"
  | "last_check"
  | "summary";

export type SetupStep = 1 | 2 | 3 | 4;

// ─── Domain Types ─────────────────────────────────────────────────────────────

export type SampleCheck = {
  no: number;
  status: "ok" | "ng" | "";
  measurement: string;
  note: string;
};

export type POSAssignment = {
  isAbsent: boolean;
  replacementId: string | null;
};

// ─── Checklist Types ──────────────────────────────────────────────────────────

export type CheckGroupItem = { id: string; label: string; description?: string };
export type CheckGroup     = { id: string; title: string; icon: string; items: CheckGroupItem[] };

// ─── Fallback checklist when line has no DB items ─────────────────────────────

export const FALLBACK_CHECK_GROUPS: CheckGroup[] = [
  {
    id: "machine",
    title: "Kondisi Mesin & Fixture",
    icon: "⚙️",
    items: [
      { id: "m-1", label: "Tidak ada kebocoran oli / air / udara pada mesin" },
      { id: "m-2", label: "Kondisi fixture & jig OK, tidak ada kerusakan atau deformasi" },
      { id: "m-3", label: "Parameter mesin sesuai standar (suhu, tekanan, speed, torque)" },
      { id: "m-4", label: "Tidak ada alarm / warning aktif di panel mesin" },
      { id: "m-5", label: "Pelumasan (lubrication) sudah dilakukan sesuai jadwal" },
    ],
  },
  {
    id: "material",
    title: "Verifikasi Material & Komponen",
    icon: "📦",
    items: [
      { id: "mt-1", label: "Material sesuai spesifikasi (part number, batch, expiry)" },
      { id: "mt-2", label: "Kondisi material baik, tidak ada rusak/contaminated" },
      { id: "mt-3", label: "Stok material cukup untuk shift ini" },
      { id: "mt-4", label: "Material tersimpan di area yang benar" },
    ],
  },
  {
    id: "5s",
    title: "5S & Housekeeping",
    icon: "🧹",
    items: [
      { id: "5s-1", label: "Area kerja bersih dan rapi dari debu/kotoran" },
      { id: "5s-2", label: "Tool & peralatan tersimpan di tempat yang ditentukan" },
      { id: "5s-3", label: "Tidak ada barang yang tidak diperlukan di area kerja" },
      { id: "5s-4", label: "Lantai area kerja kering dan aman untuk berjalan" },
    ],
  },
];

// ─── Step 1 Form State ────────────────────────────────────────────────────────

export type Step1State = {
  lineId: string;
  shiftId: string;
  groupId: string;
  productId: string;
  targetQty: number;
  workOrderNo: string;
  prodDate: string;
  actualStartTime: string;
  planStartTime: string;
  planFinishTime: string;
};

export const STEP1_DEFAULT: Step1State = {
  lineId: "",
  shiftId: "",
  groupId: "",
  productId: "",
  targetQty: 1200,
  workOrderNo: "",
  prodDate: new Date().toISOString().slice(0, 10),
  actualStartTime: "",
  planStartTime: "",
  planFinishTime: "",
};
