/** Shared types for the Operators admin section */

export type AppRole = "super_admin" | "leader" | "supervisor" | "manager";
export type FormTab = "identity" | "placement";

export interface Operator {
  id: string;
  full_name: string;
  employee_code: string | null;
  role: AppRole;
  initials: string | null;
  avatar_color: string | null;
  active: boolean;
  join_date: string | null;
  photo_url: string | null;
  position: string | null;
  supervisor_id: string | null;
}

export interface Line    { id: string; code: string; name: string; }
export interface Process { id: string; line_id: string | null; code: string; name: string; }
export interface Skill   { id: string; code: string; name: string; active: boolean; sort_order: number; }
export interface SkillReq { id: string; process_id: string; skill_id: string; min_level: number; }

export interface OpLineAssignment {
  id: string; operator_id: string; line_id: string; is_default: boolean;
}
export interface OpProcAssignment {
  id: string; operator_id: string; process_id: string; is_default: boolean;
}
export interface OpSkill {
  id: string; operator_id: string; skill_id: string;
  level: number; wi_pass: boolean;
  last_training_date: string | null; next_training_date: string | null;
  last_evaluation_date: string | null; next_evaluation_date: string | null;
  trainer_notes: string | null;
  skills: { code: string; name: string } | null;
}

export type SkillDraftRow = {
  skillId: string;
  has: boolean;
  level: number;
  wi_pass: boolean;
  existingId: string | null;
};

export const COLORS = [
  "#1A6EFA","#00B37D","#F59E0B","#EF4444",
  "#8B5CF6","#0EA5E9","#EC4899","#14B8A6",
];
