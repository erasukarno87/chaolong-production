export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      check_sheet_results: {
        Row: {
          checked_at: string
          checked_by_operator_id: string | null
          id: string
          note: string | null
          passed: boolean
          shift_run_id: string
          template_id: string
        }
        Insert: {
          checked_at?: string
          checked_by_operator_id?: string | null
          id?: string
          note?: string | null
          passed: boolean
          shift_run_id: string
          template_id: string
        }
        Update: {
          checked_at?: string
          checked_by_operator_id?: string | null
          id?: string
          note?: string | null
          passed?: boolean
          shift_run_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_sheet_results_checked_by_operator_id_fkey"
            columns: ["checked_by_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_sheet_results_checked_by_operator_id_fkey"
            columns: ["checked_by_operator_id"]
            isOneToOne: false
            referencedRelation: "operators_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_sheet_results_shift_run_id_fkey"
            columns: ["shift_run_id"]
            isOneToOne: false
            referencedRelation: "shift_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_sheet_results_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "check_sheet_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      check_sheet_templates: {
        Row: {
          active: boolean
          code: string
          id: string
          kind: Database["public"]["Enums"]["check_sheet_kind"]
          label: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code: string
          id?: string
          kind: Database["public"]["Enums"]["check_sheet_kind"]
          label: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          id?: string
          kind?: Database["public"]["Enums"]["check_sheet_kind"]
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      defect_types: {
        Row: {
          active: boolean
          category: string | null
          code: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          category?: string | null
          code: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          category?: string | null
          code?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      downtime_categories: {
        Row: {
          active: boolean
          code: string
          id: string
          is_planned: boolean
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code: string
          id?: string
          is_planned?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          id?: string
          is_planned?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      downtime_entries: {
        Row: {
          action_taken: string | null
          category_id: string | null
          created_at: string
          duration_minutes: number
          ended_at: string | null
          id: string
          kind: Database["public"]["Enums"]["dt_kind"]
          recorded_by_operator_id: string | null
          root_cause: string | null
          shift_run_id: string
          started_at: string
        }
        Insert: {
          action_taken?: string | null
          category_id?: string | null
          created_at?: string
          duration_minutes: number
          ended_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["dt_kind"]
          recorded_by_operator_id?: string | null
          root_cause?: string | null
          shift_run_id: string
          started_at?: string
        }
        Update: {
          action_taken?: string | null
          category_id?: string | null
          created_at?: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["dt_kind"]
          recorded_by_operator_id?: string | null
          root_cause?: string | null
          shift_run_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "downtime_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "downtime_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downtime_entries_recorded_by_operator_id_fkey"
            columns: ["recorded_by_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downtime_entries_recorded_by_operator_id_fkey"
            columns: ["recorded_by_operator_id"]
            isOneToOne: false
            referencedRelation: "operators_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downtime_entries_shift_run_id_fkey"
            columns: ["shift_run_id"]
            isOneToOne: false
            referencedRelation: "shift_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      eosr_reports: {
        Row: {
          achievement_pct: number
          created_by: string | null
          id: string
          notes: string | null
          oee_pct: number | null
          shift_run_id: string
          signed_at: string
          signed_by_name: string | null
          total_actual: number
          total_downtime_min: number
          total_ng: number
        }
        Insert: {
          achievement_pct?: number
          created_by?: string | null
          id?: string
          notes?: string | null
          oee_pct?: number | null
          shift_run_id: string
          signed_at?: string
          signed_by_name?: string | null
          total_actual?: number
          total_downtime_min?: number
          total_ng?: number
        }
        Update: {
          achievement_pct?: number
          created_by?: string | null
          id?: string
          notes?: string | null
          oee_pct?: number | null
          shift_run_id?: string
          signed_at?: string
          signed_by_name?: string | null
          total_actual?: number
          total_downtime_min?: number
          total_ng?: number
        }
        Relationships: [
          {
            foreignKeyName: "eosr_reports_shift_run_id_fkey"
            columns: ["shift_run_id"]
            isOneToOne: true
            referencedRelation: "shift_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      hourly_outputs: {
        Row: {
          actual_qty: number
          downtime_minutes: number
          hour_index: number
          hour_label: string
          id: string
          is_break: boolean
          ng_qty: number
          note: string | null
          recorded_at: string
          recorded_by_operator_id: string | null
          shift_run_id: string
        }
        Insert: {
          actual_qty?: number
          downtime_minutes?: number
          hour_index: number
          hour_label: string
          id?: string
          is_break?: boolean
          ng_qty?: number
          note?: string | null
          recorded_at?: string
          recorded_by_operator_id?: string | null
          shift_run_id: string
        }
        Update: {
          actual_qty?: number
          downtime_minutes?: number
          hour_index?: number
          hour_label?: string
          id?: string
          is_break?: boolean
          ng_qty?: number
          note?: string | null
          recorded_at?: string
          recorded_by_operator_id?: string | null
          shift_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hourly_outputs_recorded_by_operator_id_fkey"
            columns: ["recorded_by_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hourly_outputs_recorded_by_operator_id_fkey"
            columns: ["recorded_by_operator_id"]
            isOneToOne: false
            referencedRelation: "operators_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hourly_outputs_shift_run_id_fkey"
            columns: ["shift_run_id"]
            isOneToOne: false
            referencedRelation: "shift_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      lines: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ng_entries: {
        Row: {
          created_at: string
          defect_type_id: string | null
          description: string | null
          disposition: Database["public"]["Enums"]["ng_disposition"]
          found_at: string
          found_by_operator_id: string | null
          id: string
          qty: number
          shift_run_id: string
          sub_process_id: string | null
        }
        Insert: {
          created_at?: string
          defect_type_id?: string | null
          description?: string | null
          disposition?: Database["public"]["Enums"]["ng_disposition"]
          found_at?: string
          found_by_operator_id?: string | null
          id?: string
          qty?: number
          shift_run_id: string
          sub_process_id?: string | null
        }
        Update: {
          created_at?: string
          defect_type_id?: string | null
          description?: string | null
          disposition?: Database["public"]["Enums"]["ng_disposition"]
          found_at?: string
          found_by_operator_id?: string | null
          id?: string
          qty?: number
          shift_run_id?: string
          sub_process_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ng_entries_defect_type_id_fkey"
            columns: ["defect_type_id"]
            isOneToOne: false
            referencedRelation: "defect_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ng_entries_found_by_operator_id_fkey"
            columns: ["found_by_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ng_entries_found_by_operator_id_fkey"
            columns: ["found_by_operator_id"]
            isOneToOne: false
            referencedRelation: "operators_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ng_entries_shift_run_id_fkey"
            columns: ["shift_run_id"]
            isOneToOne: false
            referencedRelation: "shift_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ng_entries_sub_process_id_fkey"
            columns: ["sub_process_id"]
            isOneToOne: false
            referencedRelation: "sub_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_skills: {
        Row: {
          id: string
          last_evaluation_date: string | null
          last_training_date: string | null
          level: number
          next_evaluation_date: string | null
          next_training_date: string | null
          operator_id: string
          skill_id: string
          trainer_notes: string | null
          updated_at: string
          wi_pass: boolean
        }
        Insert: {
          id?: string
          last_evaluation_date?: string | null
          last_training_date?: string | null
          level?: number
          next_evaluation_date?: string | null
          next_training_date?: string | null
          operator_id: string
          skill_id: string
          trainer_notes?: string | null
          updated_at?: string
          wi_pass?: boolean
        }
        Update: {
          id?: string
          last_evaluation_date?: string | null
          last_training_date?: string | null
          level?: number
          next_evaluation_date?: string | null
          next_training_date?: string | null
          operator_id?: string
          skill_id?: string
          trainer_notes?: string | null
          updated_at?: string
          wi_pass?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "operator_skills_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_skills_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          active: boolean
          avatar_color: string | null
          created_at: string
          employee_code: string | null
          full_name: string
          id: string
          initials: string | null
          join_date: string | null
          photo_url: string | null
          pin_hash: string
          position: string | null
          role: Database["public"]["Enums"]["app_role"]
          supervisor_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_color?: string | null
          created_at?: string
          employee_code?: string | null
          full_name: string
          id?: string
          initials?: string | null
          join_date?: string | null
          photo_url?: string | null
          pin_hash: string
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          supervisor_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_color?: string | null
          created_at?: string
          employee_code?: string | null
          full_name?: string
          id?: string
          initials?: string | null
          join_date?: string | null
          photo_url?: string | null
          pin_hash?: string
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          supervisor_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      processes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      production_targets: {
        Row: {
          created_at: string
          effective_from: string
          hourly_target: number | null
          id: string
          line_id: string
          product_id: string
          shift_id: string
          target_qty: number
        }
        Insert: {
          created_at?: string
          effective_from?: string
          hourly_target?: number | null
          id?: string
          line_id: string
          product_id: string
          shift_id: string
          target_qty: number
        }
        Update: {
          created_at?: string
          effective_from?: string
          hourly_target?: number | null
          id?: string
          line_id?: string
          product_id?: string
          shift_id?: string
          target_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_targets_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_targets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_targets_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          model: string | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          model?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          model?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shift_runs: {
        Row: {
          created_at: string
          created_by: string | null
          ended_at: string | null
          hourly_target: number
          id: string
          leader_operator_id: string | null
          line_id: string
          notes: string | null
          product_id: string
          shift_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["shift_run_status"]
          target_qty: number
          updated_at: string
          work_order: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          hourly_target?: number
          id?: string
          leader_operator_id?: string | null
          line_id: string
          notes?: string | null
          product_id: string
          shift_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["shift_run_status"]
          target_qty?: number
          updated_at?: string
          work_order?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          hourly_target?: number
          id?: string
          leader_operator_id?: string | null
          line_id?: string
          notes?: string | null
          product_id?: string
          shift_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["shift_run_status"]
          target_qty?: number
          updated_at?: string
          work_order?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_runs_leader_operator_id_fkey"
            columns: ["leader_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_runs_leader_operator_id_fkey"
            columns: ["leader_operator_id"]
            isOneToOne: false
            referencedRelation: "operators_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_runs_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_runs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_runs_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          active: boolean
          break_minutes: number
          code: string
          end_time: string
          id: string
          name: string
          start_time: string
        }
        Insert: {
          active?: boolean
          break_minutes?: number
          code: string
          end_time: string
          id?: string
          name: string
          start_time: string
        }
        Update: {
          active?: boolean
          break_minutes?: number
          code?: string
          end_time?: string
          id?: string
          name?: string
          start_time?: string
        }
        Relationships: []
      }
      sub_processes: {
        Row: {
          code: string
          id: string
          name: string
          process_id: string
          sort_order: number
        }
        Insert: {
          code: string
          id?: string
          name: string
          process_id: string
          sort_order?: number
        }
        Update: {
          code?: string
          id?: string
          name?: string
          process_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "sub_processes_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      operators_public: {
        Row: {
          active: boolean | null
          assigned_line_ids: string[] | null
          avatar_color: string | null
          created_at: string | null
          employee_code: string | null
          full_name: string | null
          id: string | null
          initials: string | null
          join_date: string | null
          photo_url: string | null
          position: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          supervisor_id: string | null
        }
        Insert: {
          active?: boolean | null
          assigned_line_ids?: string[] | null
          avatar_color?: string | null
          created_at?: string | null
          employee_code?: string | null
          full_name?: string | null
          id?: string | null
          initials?: string | null
          join_date?: string | null
          photo_url?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          supervisor_id?: string | null
        }
        Update: {
          active?: boolean | null
          assigned_line_ids?: string[] | null
          avatar_color?: string | null
          created_at?: string | null
          employee_code?: string | null
          full_name?: string | null
          id?: string | null
          initials?: string | null
          join_date?: string | null
          photo_url?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          supervisor_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_my_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      run_is_active: { Args: { _run_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "leader" | "operator" | "viewer"
      check_sheet_kind: "5F5L" | "AUTONOMOUS"
      dt_kind: "planned" | "unplanned"
      ng_disposition: "rework" | "scrap" | "hold" | "accepted"
      shift_run_status: "setup" | "running" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "leader", "operator", "viewer"],
      check_sheet_kind: ["5F5L", "AUTONOMOUS"],
      dt_kind: ["planned", "unplanned"],
      ng_disposition: ["rework", "scrap", "hold", "accepted"],
      shift_run_status: ["setup", "running", "completed", "cancelled"],
    },
  },
} as const
