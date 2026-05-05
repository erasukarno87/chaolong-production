/** Shared types and constants for the Traceability page */
import type { ElementType } from "react";
import { Users, Wrench, BarChart3, Boxes, Leaf } from "lucide-react";

export interface TraceRun {
  id: string;
  work_order: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  target_qty: number;
  hourly_target: number;
  notes: string | null;
  lines?: { code: string; name: string };
  products?: { code: string; name: string };
  shifts?: { name: string; start_time: string; end_time: string };
}

export interface TraceHourly {
  hour_index: number;
  hour_label: string;
  actual_qty: number;
  ng_qty: number;
  downtime_minutes: number;
  is_break: boolean;
  note: string | null;
}

export interface TraceNg {
  id: string;
  qty: number;
  disposition: string;
  description: string | null;
  found_at: string;
  defect_types?: { code: string; name: string; category: string | null } | null;
  processes?: { code: string; name: string } | null;
}

export interface TraceDowntime {
  id: string;
  kind: string;
  duration_minutes: number;
  started_at: string;
  ended_at: string | null;
  root_cause: string | null;
  action_taken: string | null;
  downtime_categories?: {
    code: string;
    name: string;
    category: string | null;
    is_planned: boolean;
  } | null;
}

export type DetailTab = "summary" | "hourly" | "ng" | "downtime" | "fourm";

export const FOURM_META: Record<string, { label: string; icon: ElementType; color: string; bg: string }> = {
  Man:         { label: "Man",         icon: Users,     color: "text-blue-600",   bg: "bg-blue-100"   },
  Machine:     { label: "Machine",     icon: Wrench,    color: "text-red-600",    bg: "bg-red-100"    },
  Method:      { label: "Method",      icon: BarChart3, color: "text-amber-600",  bg: "bg-amber-100"  },
  Material:    { label: "Material",    icon: Boxes,     color: "text-violet-600", bg: "bg-violet-100" },
  Environment: { label: "Environment", icon: Leaf,      color: "text-green-600",  bg: "bg-green-100"  },
};

export const STATUS_CHIP: Record<string, string> = {
  running:   "chip chip-info",
  completed: "chip chip-success",
  setup:     "chip chip-warning",
  cancelled: "chip chip-danger",
};

export const STATUS_LABEL: Record<string, string> = {
  running:   "Berjalan",
  completed: "Selesai",
  setup:     "Setup",
  cancelled: "Dibatalkan",
};

export const DISPOSITION_CHIP: Record<string, string> = {
  rework:   "chip chip-warning",
  scrap:    "chip chip-danger",
  hold:     "bg-slate-100 text-slate-600 chip",
  accepted: "chip chip-success",
};
