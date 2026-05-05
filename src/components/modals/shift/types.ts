/** Shared data-transfer types for all Shift modals. */

export interface ShiftSetupData {
  line_id: string;
  shift_id: string;
  product_id: string;
  target_quantity: number;
  hourly_target: number;
  work_order_no: string;
  leader_user_id: string;
  operator_ids: string[];
  checklist_completed: boolean;
  notes: string;
  group_id?: string | null;
  actual_started_at?: string;
  plan_start_at?: string;
  plan_finish_at?: string;
}

export interface NgEntryData {
  hour_label: string;
  process_id: string;
  defect_type_id: string;
  quantity: number;
  disposition: "rework" | "scrap" | "hold" | "accepted";
  description: string;
}

export interface DowntimeData {
  category_id: string;
  kind: "planned" | "unplanned";
  start_time: string;
  end_time: string;
  duration: number;
  root_cause: string;
  action_taken: string;
}
