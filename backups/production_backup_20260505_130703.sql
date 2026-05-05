


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'super_admin',
    'leader',
    'operator',
    'viewer',
    'supervisor',
    'manager'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."check_sheet_kind" AS ENUM (
    '5F5L',
    'AUTONOMOUS'
);


ALTER TYPE "public"."check_sheet_kind" OWNER TO "postgres";


CREATE TYPE "public"."dt_kind" AS ENUM (
    'planned',
    'unplanned'
);


ALTER TYPE "public"."dt_kind" OWNER TO "postgres";


CREATE TYPE "public"."ng_disposition" AS ENUM (
    'rework',
    'scrap',
    'hold',
    'accepted'
);


ALTER TYPE "public"."ng_disposition" OWNER TO "postgres";


CREATE TYPE "public"."shift_run_status" AS ENUM (
    'setup',
    'running',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."shift_run_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_email_by_username"("p_username" "text") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT email FROM public.profiles WHERE lower(username) = lower(p_username) LIMIT 1;
$$;


ALTER FUNCTION "public"."get_email_by_username"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_roles"() RETURNS SETOF "public"."app_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
$$;


ALTER FUNCTION "public"."get_my_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  END IF;
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hash_operator_pin"("pin" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN extensions.crypt(pin, extensions.gen_salt('bf', 10));
END; $$;


ALTER FUNCTION "public"."hash_operator_pin"("pin" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_is_active"("_run_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.shift_runs WHERE id = _run_id AND status IN ('setup', 'running'))
$$;


ALTER FUNCTION "public"."run_is_active"("_run_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_shift_break_minutes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE v_shift_id UUID;
BEGIN
  v_shift_id := COALESCE(NEW.shift_id, OLD.shift_id);
  UPDATE public.shifts
  SET break_minutes = (
    SELECT COALESCE(SUM(duration_minutes), 0)
    FROM public.shift_breaks WHERE shift_id = v_shift_id
  )
  WHERE id = v_shift_id;
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."sync_shift_break_minutes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_operator_pin"("p_operator_id" "uuid", "p_pin" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  op               RECORD;
  v_assigned_lines UUID[];
BEGIN
  SELECT id, full_name, employee_code, role, initials, avatar_color, active, position, pin_hash
  INTO op FROM public.operators
  WHERE id = p_operator_id AND active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  IF op.pin_hash IS NULL OR op.pin_hash <> extensions.crypt(p_pin, op.pin_hash) THEN
    RETURN json_build_object('error', 'invalid_pin');
  END IF;

  SELECT COALESCE(ARRAY_AGG(line_id ORDER BY is_default DESC, created_at ASC), ARRAY[]::UUID[])
  INTO   v_assigned_lines
  FROM   public.operator_line_assignments
  WHERE  operator_id = p_operator_id;

  RETURN json_build_object('operator', json_build_object(
    'id',                op.id,
    'full_name',         op.full_name,
    'employee_code',     op.employee_code,
    'role',              op.role,
    'initials',          op.initials,
    'avatar_color',      op.avatar_color,
    'active',            op.active,
    'position',          op.position,
    'assigned_line_ids', v_assigned_lines
  ));
END; $$;


ALTER FUNCTION "public"."verify_operator_pin"("p_operator_id" "uuid", "p_pin" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."autonomous_check_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "line_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "frequency" "text" DEFAULT 'Setiap Shift'::"text" NOT NULL,
    "standard" "text",
    "method" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "process_id" "uuid",
    "image_url" "text"
);


ALTER TABLE "public"."autonomous_check_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."check_sheet_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shift_run_id" "uuid" NOT NULL,
    "template_id" "uuid" NOT NULL,
    "passed" boolean NOT NULL,
    "checked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "checked_by_operator_id" "uuid",
    "note" "text"
);


ALTER TABLE "public"."check_sheet_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."check_sheet_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kind" "public"."check_sheet_kind" NOT NULL,
    "code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."check_sheet_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."defect_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "product_id" "uuid",
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."defect_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."downtime_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "description" "text",
    "is_planned" boolean DEFAULT false NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."downtime_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."downtime_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shift_run_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "kind" "public"."dt_kind" DEFAULT 'unplanned'::"public"."dt_kind" NOT NULL,
    "duration_minutes" integer NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "root_cause" "text",
    "action_taken" "text",
    "recorded_by_operator_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."downtime_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."eosr_reports" (
    "id" "uuid" NOT NULL,
    "total_actual" integer DEFAULT 0 NOT NULL,
    "total_ng" integer DEFAULT 0 NOT NULL,
    "total_downtime_min" integer DEFAULT 0 NOT NULL,
    "achievement_pct" numeric(5,2) DEFAULT 0 NOT NULL,
    "oee_pct" numeric(5,2),
    "notes" "text",
    "signed_by_name" "text",
    "signed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"()
);


ALTER TABLE "public"."eosr_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fivef5l_check_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "line_id" "uuid" NOT NULL,
    "process_id" "uuid",
    "sort_group" integer DEFAULT 1 NOT NULL,
    "group_name" "text" NOT NULL,
    "specification" "text" NOT NULL,
    "method" "text" DEFAULT 'Visual'::"text" NOT NULL,
    "input_type" "text" DEFAULT 'ok_ng'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fivef5l_check_items_input_type_check" CHECK (("input_type" = ANY (ARRAY['ok_ng'::"text", 'float'::"text", 'text'::"text"])))
);


ALTER TABLE "public"."fivef5l_check_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_leaders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."group_leaders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_process_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "process_id" "uuid" NOT NULL,
    "operator_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."group_process_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "line_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hourly_outputs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shift_run_id" "uuid" NOT NULL,
    "hour_index" integer NOT NULL,
    "hour_label" "text" NOT NULL,
    "actual_qty" integer DEFAULT 0 NOT NULL,
    "ng_qty" integer DEFAULT 0 NOT NULL,
    "downtime_minutes" integer DEFAULT 0 NOT NULL,
    "is_break" boolean DEFAULT false NOT NULL,
    "note" "text",
    "recorded_by_operator_id" "uuid",
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hourly_outputs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ng_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shift_run_id" "uuid" NOT NULL,
    "defect_type_id" "uuid",
    "process_id" "uuid",
    "sub_process_id" "uuid",
    "qty" integer DEFAULT 1 NOT NULL,
    "disposition" "public"."ng_disposition" DEFAULT 'rework'::"public"."ng_disposition" NOT NULL,
    "found_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "found_by_operator_id" "uuid",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ng_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operator_line_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operator_id" "uuid" NOT NULL,
    "line_id" "uuid" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."operator_line_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operator_process_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operator_id" "uuid" NOT NULL,
    "process_id" "uuid" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."operator_process_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operator_skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operator_id" "uuid" NOT NULL,
    "skill_id" "uuid" NOT NULL,
    "level" integer DEFAULT 0 NOT NULL,
    "wi_pass" boolean DEFAULT false NOT NULL,
    "last_training_date" "date",
    "next_training_date" "date",
    "last_evaluation_date" "date",
    "next_evaluation_date" "date",
    "trainer_notes" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "operator_skills_level_check" CHECK ((("level" >= 0) AND ("level" <= 4)))
);


ALTER TABLE "public"."operator_skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "employee_code" "text",
    "role" "public"."app_role" DEFAULT 'leader'::"public"."app_role" NOT NULL,
    "initials" "text",
    "avatar_color" "text" DEFAULT '#1A6EFA'::"text",
    "active" boolean DEFAULT true NOT NULL,
    "join_date" "date",
    "photo_url" "text",
    "position" "text",
    "supervisor_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."operators" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."operators_public" WITH ("security_invoker"='true') AS
 SELECT "id",
    "full_name",
    "employee_code",
    "role",
    "initials",
    "avatar_color",
    "active",
    "join_date",
    "photo_url",
    "position",
    "supervisor_id",
    "created_at",
    COALESCE(ARRAY( SELECT "operator_line_assignments"."line_id"
           FROM "public"."operator_line_assignments"
          WHERE ("operator_line_assignments"."operator_id" = "o"."id")
          ORDER BY "operator_line_assignments"."is_default" DESC, "operator_line_assignments"."created_at"), ARRAY[]::"uuid"[]) AS "assigned_line_ids"
   FROM "public"."operators" "o";


ALTER VIEW "public"."operators_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."process_skill_requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "process_id" "uuid" NOT NULL,
    "skill_id" "uuid" NOT NULL,
    "min_level" integer DEFAULT 2 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "process_skill_requirements_min_level_check" CHECK ((("min_level" >= 1) AND ("min_level" <= 4)))
);


ALTER TABLE "public"."process_skill_requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."processes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "line_id" "uuid",
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 10 NOT NULL,
    "cycle_time_seconds" numeric(10,2),
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "processes_cycle_time_seconds_check" CHECK ((("cycle_time_seconds" IS NULL) OR ("cycle_time_seconds" > (0)::numeric)))
);


ALTER TABLE "public"."processes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_lines" (
    "product_id" "uuid" NOT NULL,
    "line_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."production_targets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "line_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "shift_id" "uuid" NOT NULL,
    "man_power" integer DEFAULT 1 NOT NULL,
    "target_qty" integer NOT NULL,
    "hourly_target" integer,
    "cycle_time_seconds" numeric(10,2),
    "effective_from" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "production_targets_cycle_time_seconds_check" CHECK ((("cycle_time_seconds" IS NULL) OR ("cycle_time_seconds" > (0)::numeric))),
    CONSTRAINT "production_targets_man_power_check" CHECK (("man_power" >= 1))
);


ALTER TABLE "public"."production_targets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "model" "text",
    "category" "text",
    "description" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "display_name" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "username" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ref_autonomous_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."ref_autonomous_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ref_autonomous_frequencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."ref_autonomous_frequencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ref_downtime_classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."ref_downtime_classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ref_ng_classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."ref_ng_classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ref_product_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."ref_product_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shift_breaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shift_id" "uuid" NOT NULL,
    "break_order" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "duration_minutes" integer NOT NULL,
    "label" "text" DEFAULT 'Istirahat'::"text" NOT NULL,
    CONSTRAINT "shift_breaks_break_order_check" CHECK ((("break_order" >= 1) AND ("break_order" <= 3))),
    CONSTRAINT "shift_breaks_duration_minutes_check" CHECK (("duration_minutes" > 0))
);


ALTER TABLE "public"."shift_breaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shift_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "line_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "shift_id" "uuid" NOT NULL,
    "group_id" "uuid",
    "work_order" "text",
    "target_qty" integer DEFAULT 0 NOT NULL,
    "hourly_target" integer DEFAULT 0 NOT NULL,
    "status" "public"."shift_run_status" DEFAULT 'setup'::"public"."shift_run_status" NOT NULL,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "notes" "text",
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "leader_user_id" "uuid"
);


ALTER TABLE "public"."shift_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "break_minutes" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 10 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sub_processes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "process_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."sub_processes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."autonomous_check_items"
    ADD CONSTRAINT "autonomous_check_items_line_id_code_key" UNIQUE ("line_id", "code");



ALTER TABLE ONLY "public"."autonomous_check_items"
    ADD CONSTRAINT "autonomous_check_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."check_sheet_results"
    ADD CONSTRAINT "check_sheet_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."check_sheet_results"
    ADD CONSTRAINT "check_sheet_results_shift_run_id_template_id_key" UNIQUE ("shift_run_id", "template_id");



ALTER TABLE ONLY "public"."check_sheet_templates"
    ADD CONSTRAINT "check_sheet_templates_kind_code_key" UNIQUE ("kind", "code");



ALTER TABLE ONLY "public"."check_sheet_templates"
    ADD CONSTRAINT "check_sheet_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."defect_types"
    ADD CONSTRAINT "defect_types_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."defect_types"
    ADD CONSTRAINT "defect_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."downtime_categories"
    ADD CONSTRAINT "downtime_categories_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."downtime_categories"
    ADD CONSTRAINT "downtime_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."downtime_entries"
    ADD CONSTRAINT "downtime_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."eosr_reports"
    ADD CONSTRAINT "eosr_reports_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."fivef5l_check_items"
    ADD CONSTRAINT "fivef5l_check_items_line_id_sort_group_sort_order_key" UNIQUE ("line_id", "sort_group", "sort_order");



ALTER TABLE ONLY "public"."fivef5l_check_items"
    ADD CONSTRAINT "fivef5l_check_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_leaders"
    ADD CONSTRAINT "group_leaders_group_id_user_id_key" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."group_leaders"
    ADD CONSTRAINT "group_leaders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_process_assignments"
    ADD CONSTRAINT "group_process_assignments_group_id_process_id_operator_id_key" UNIQUE ("group_id", "process_id", "operator_id");



ALTER TABLE ONLY "public"."group_process_assignments"
    ADD CONSTRAINT "group_process_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_line_id_code_key" UNIQUE ("line_id", "code");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hourly_outputs"
    ADD CONSTRAINT "hourly_outputs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hourly_outputs"
    ADD CONSTRAINT "hourly_outputs_shift_run_id_hour_index_key" UNIQUE ("shift_run_id", "hour_index");



ALTER TABLE ONLY "public"."lines"
    ADD CONSTRAINT "lines_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."lines"
    ADD CONSTRAINT "lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ng_entries"
    ADD CONSTRAINT "ng_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operator_line_assignments"
    ADD CONSTRAINT "operator_line_assignments_operator_id_line_id_key" UNIQUE ("operator_id", "line_id");



ALTER TABLE ONLY "public"."operator_line_assignments"
    ADD CONSTRAINT "operator_line_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operator_process_assignments"
    ADD CONSTRAINT "operator_process_assignments_operator_id_process_id_key" UNIQUE ("operator_id", "process_id");



ALTER TABLE ONLY "public"."operator_process_assignments"
    ADD CONSTRAINT "operator_process_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operator_skills"
    ADD CONSTRAINT "operator_skills_operator_id_skill_id_key" UNIQUE ("operator_id", "skill_id");



ALTER TABLE ONLY "public"."operator_skills"
    ADD CONSTRAINT "operator_skills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_employee_code_key" UNIQUE ("employee_code");



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."process_skill_requirements"
    ADD CONSTRAINT "process_skill_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."process_skill_requirements"
    ADD CONSTRAINT "process_skill_requirements_process_id_skill_id_key" UNIQUE ("process_id", "skill_id");



ALTER TABLE ONLY "public"."processes"
    ADD CONSTRAINT "processes_line_id_code_key" UNIQUE ("line_id", "code");



ALTER TABLE ONLY "public"."processes"
    ADD CONSTRAINT "processes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_lines"
    ADD CONSTRAINT "product_lines_pkey" PRIMARY KEY ("product_id", "line_id");



ALTER TABLE ONLY "public"."production_targets"
    ADD CONSTRAINT "production_targets_line_id_product_id_shift_id_man_power_ef_key" UNIQUE ("line_id", "product_id", "shift_id", "man_power", "effective_from");



ALTER TABLE ONLY "public"."production_targets"
    ADD CONSTRAINT "production_targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."ref_autonomous_categories"
    ADD CONSTRAINT "ref_autonomous_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."ref_autonomous_categories"
    ADD CONSTRAINT "ref_autonomous_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ref_autonomous_frequencies"
    ADD CONSTRAINT "ref_autonomous_frequencies_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."ref_autonomous_frequencies"
    ADD CONSTRAINT "ref_autonomous_frequencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ref_downtime_classes"
    ADD CONSTRAINT "ref_downtime_classes_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."ref_downtime_classes"
    ADD CONSTRAINT "ref_downtime_classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ref_ng_classes"
    ADD CONSTRAINT "ref_ng_classes_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."ref_ng_classes"
    ADD CONSTRAINT "ref_ng_classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ref_product_categories"
    ADD CONSTRAINT "ref_product_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."ref_product_categories"
    ADD CONSTRAINT "ref_product_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shift_breaks"
    ADD CONSTRAINT "shift_breaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shift_breaks"
    ADD CONSTRAINT "shift_breaks_shift_id_break_order_key" UNIQUE ("shift_id", "break_order");



ALTER TABLE ONLY "public"."shift_runs"
    ADD CONSTRAINT "shift_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skills"
    ADD CONSTRAINT "skills_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."skills"
    ADD CONSTRAINT "skills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sub_processes"
    ADD CONSTRAINT "sub_processes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sub_processes"
    ADD CONSTRAINT "sub_processes_process_id_code_key" UNIQUE ("process_id", "code");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



CREATE INDEX "idx_aci_process_id" ON "public"."autonomous_check_items" USING "btree" ("process_id");



CREATE INDEX "idx_autonomous_check_items_line" ON "public"."autonomous_check_items" USING "btree" ("line_id", "sort_order");



CREATE INDEX "idx_defect_types_product" ON "public"."defect_types" USING "btree" ("product_id");



CREATE INDEX "idx_dt_run" ON "public"."downtime_entries" USING "btree" ("shift_run_id");



CREATE INDEX "idx_fivef5l_line_group" ON "public"."fivef5l_check_items" USING "btree" ("line_id", "sort_group", "sort_order");



CREATE INDEX "idx_fivef5l_line_id" ON "public"."fivef5l_check_items" USING "btree" ("line_id");



CREATE INDEX "idx_gl_group" ON "public"."group_leaders" USING "btree" ("group_id");



CREATE INDEX "idx_gl_user" ON "public"."group_leaders" USING "btree" ("user_id");



CREATE INDEX "idx_gpa_group" ON "public"."group_process_assignments" USING "btree" ("group_id");



CREATE INDEX "idx_gpa_group_process" ON "public"."group_process_assignments" USING "btree" ("group_id", "process_id");



CREATE INDEX "idx_groups_line" ON "public"."groups" USING "btree" ("line_id");



CREATE INDEX "idx_ng_entries_process" ON "public"."ng_entries" USING "btree" ("process_id");



CREATE INDEX "idx_ng_run" ON "public"."ng_entries" USING "btree" ("shift_run_id");



CREATE INDEX "idx_product_lines_line" ON "public"."product_lines" USING "btree" ("line_id");



CREATE UNIQUE INDEX "idx_profiles_username_lower" ON "public"."profiles" USING "btree" ("lower"("username")) WHERE ("username" IS NOT NULL);



CREATE INDEX "idx_shift_runs_line_status" ON "public"."shift_runs" USING "btree" ("line_id", "status");



CREATE INDEX "idx_shift_runs_started" ON "public"."shift_runs" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_shift_runs_work_order" ON "public"."shift_runs" USING "btree" ("work_order") WHERE ("work_order" IS NOT NULL);



CREATE OR REPLACE TRIGGER "tg_lines_updated" BEFORE UPDATE ON "public"."lines" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "tg_products_updated" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "tg_shift_runs_updated" BEFORE UPDATE ON "public"."shift_runs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "tg_sync_break_minutes" AFTER INSERT OR DELETE OR UPDATE ON "public"."shift_breaks" FOR EACH ROW EXECUTE FUNCTION "public"."sync_shift_break_minutes"();



CREATE OR REPLACE TRIGGER "update_operators_updated_at" BEFORE UPDATE ON "public"."operators" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."autonomous_check_items"
    ADD CONSTRAINT "autonomous_check_items_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."autonomous_check_items"
    ADD CONSTRAINT "autonomous_check_items_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."check_sheet_results"
    ADD CONSTRAINT "check_sheet_results_checked_by_operator_id_fkey" FOREIGN KEY ("checked_by_operator_id") REFERENCES "public"."operators"("id");



ALTER TABLE ONLY "public"."check_sheet_results"
    ADD CONSTRAINT "check_sheet_results_shift_run_id_fkey" FOREIGN KEY ("shift_run_id") REFERENCES "public"."shift_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."check_sheet_results"
    ADD CONSTRAINT "check_sheet_results_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."check_sheet_templates"("id");



ALTER TABLE ONLY "public"."defect_types"
    ADD CONSTRAINT "defect_types_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."downtime_entries"
    ADD CONSTRAINT "downtime_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."downtime_categories"("id");



ALTER TABLE ONLY "public"."downtime_entries"
    ADD CONSTRAINT "downtime_entries_recorded_by_operator_id_fkey" FOREIGN KEY ("recorded_by_operator_id") REFERENCES "public"."operators"("id");



ALTER TABLE ONLY "public"."downtime_entries"
    ADD CONSTRAINT "downtime_entries_shift_run_id_fkey" FOREIGN KEY ("shift_run_id") REFERENCES "public"."shift_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."eosr_reports"
    ADD CONSTRAINT "eosr_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."eosr_reports"
    ADD CONSTRAINT "eosr_reports_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."shift_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fivef5l_check_items"
    ADD CONSTRAINT "fivef5l_check_items_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fivef5l_check_items"
    ADD CONSTRAINT "fivef5l_check_items_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."group_leaders"
    ADD CONSTRAINT "group_leaders_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_leaders"
    ADD CONSTRAINT "group_leaders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_process_assignments"
    ADD CONSTRAINT "group_process_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_process_assignments"
    ADD CONSTRAINT "group_process_assignments_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_process_assignments"
    ADD CONSTRAINT "group_process_assignments_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hourly_outputs"
    ADD CONSTRAINT "hourly_outputs_recorded_by_operator_id_fkey" FOREIGN KEY ("recorded_by_operator_id") REFERENCES "public"."operators"("id");



ALTER TABLE ONLY "public"."hourly_outputs"
    ADD CONSTRAINT "hourly_outputs_shift_run_id_fkey" FOREIGN KEY ("shift_run_id") REFERENCES "public"."shift_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ng_entries"
    ADD CONSTRAINT "ng_entries_defect_type_id_fkey" FOREIGN KEY ("defect_type_id") REFERENCES "public"."defect_types"("id");



ALTER TABLE ONLY "public"."ng_entries"
    ADD CONSTRAINT "ng_entries_found_by_operator_id_fkey" FOREIGN KEY ("found_by_operator_id") REFERENCES "public"."operators"("id");



ALTER TABLE ONLY "public"."ng_entries"
    ADD CONSTRAINT "ng_entries_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ng_entries"
    ADD CONSTRAINT "ng_entries_shift_run_id_fkey" FOREIGN KEY ("shift_run_id") REFERENCES "public"."shift_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ng_entries"
    ADD CONSTRAINT "ng_entries_sub_process_id_fkey" FOREIGN KEY ("sub_process_id") REFERENCES "public"."sub_processes"("id");



ALTER TABLE ONLY "public"."operator_line_assignments"
    ADD CONSTRAINT "operator_line_assignments_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operator_line_assignments"
    ADD CONSTRAINT "operator_line_assignments_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operator_process_assignments"
    ADD CONSTRAINT "operator_process_assignments_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operator_process_assignments"
    ADD CONSTRAINT "operator_process_assignments_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operator_skills"
    ADD CONSTRAINT "operator_skills_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operator_skills"
    ADD CONSTRAINT "operator_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."operators"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."process_skill_requirements"
    ADD CONSTRAINT "process_skill_requirements_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."process_skill_requirements"
    ADD CONSTRAINT "process_skill_requirements_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."processes"
    ADD CONSTRAINT "processes_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_lines"
    ADD CONSTRAINT "product_lines_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_lines"
    ADD CONSTRAINT "product_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."production_targets"
    ADD CONSTRAINT "production_targets_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."production_targets"
    ADD CONSTRAINT "production_targets_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."production_targets"
    ADD CONSTRAINT "production_targets_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shift_breaks"
    ADD CONSTRAINT "shift_breaks_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shift_runs"
    ADD CONSTRAINT "shift_runs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."shift_runs"
    ADD CONSTRAINT "shift_runs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shift_runs"
    ADD CONSTRAINT "shift_runs_leader_user_id_fkey" FOREIGN KEY ("leader_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shift_runs"
    ADD CONSTRAINT "shift_runs_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id");



ALTER TABLE ONLY "public"."shift_runs"
    ADD CONSTRAINT "shift_runs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."shift_runs"
    ADD CONSTRAINT "shift_runs_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id");



ALTER TABLE ONLY "public"."sub_processes"
    ADD CONSTRAINT "sub_processes_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."autonomous_check_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "autonomous_check_items_admin" ON "public"."autonomous_check_items" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "autonomous_check_items_read" ON "public"."autonomous_check_items" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."check_sheet_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."check_sheet_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "check_sheet_templates_admin" ON "public"."check_sheet_templates" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "check_sheet_templates_read" ON "public"."check_sheet_templates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "cs_read" ON "public"."check_sheet_results" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "cs_write" ON "public"."check_sheet_results" TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR (("public"."has_role"("auth"."uid"(), 'leader'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'operator'::"public"."app_role")) AND "public"."run_is_active"("shift_run_id")))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR (("public"."has_role"("auth"."uid"(), 'leader'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'operator'::"public"."app_role")) AND "public"."run_is_active"("shift_run_id"))));



ALTER TABLE "public"."defect_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "defect_types_admin" ON "public"."defect_types" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "defect_types_read" ON "public"."defect_types" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."downtime_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "downtime_categories_admin" ON "public"."downtime_categories" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "downtime_categories_read" ON "public"."downtime_categories" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."downtime_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dt_read" ON "public"."downtime_entries" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "dt_write" ON "public"."downtime_entries" TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR (("public"."has_role"("auth"."uid"(), 'leader'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'operator'::"public"."app_role")) AND "public"."run_is_active"("shift_run_id")))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR (("public"."has_role"("auth"."uid"(), 'leader'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'operator'::"public"."app_role")) AND "public"."run_is_active"("shift_run_id"))));



CREATE POLICY "eosr_read" ON "public"."eosr_reports" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."eosr_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "eosr_write" ON "public"."eosr_reports" TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'leader'::"public"."app_role"))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'leader'::"public"."app_role")));



ALTER TABLE "public"."fivef5l_check_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fivef5l_read" ON "public"."fivef5l_check_items" FOR SELECT USING (true);



CREATE POLICY "fivef5l_write" ON "public"."fivef5l_check_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "gpa_read" ON "public"."group_process_assignments" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "gpa_write" ON "public"."group_process_assignments" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"public"."app_role")))));



ALTER TABLE "public"."group_leaders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "group_leaders_read" ON "public"."group_leaders" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "group_leaders_write" ON "public"."group_leaders" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"public"."app_role")))));



ALTER TABLE "public"."group_process_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "groups_read" ON "public"."groups" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "groups_write" ON "public"."groups" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"public"."app_role")))));



ALTER TABLE "public"."hourly_outputs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hourly_read" ON "public"."hourly_outputs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "hourly_write" ON "public"."hourly_outputs" TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR (("public"."has_role"("auth"."uid"(), 'leader'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'operator'::"public"."app_role")) AND "public"."run_is_active"("shift_run_id")))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR (("public"."has_role"("auth"."uid"(), 'leader'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'operator'::"public"."app_role")) AND "public"."run_is_active"("shift_run_id"))));



ALTER TABLE "public"."lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lines_admin" ON "public"."lines" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "lines_read" ON "public"."lines" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."ng_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ng_read" ON "public"."ng_entries" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ng_write" ON "public"."ng_entries" TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR (("public"."has_role"("auth"."uid"(), 'leader'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'operator'::"public"."app_role")) AND "public"."run_is_active"("shift_run_id")))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR (("public"."has_role"("auth"."uid"(), 'leader'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'operator'::"public"."app_role")) AND "public"."run_is_active"("shift_run_id"))));



ALTER TABLE "public"."operator_line_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "operator_line_assignments_admin" ON "public"."operator_line_assignments" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "operator_line_assignments_read" ON "public"."operator_line_assignments" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."operator_process_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "operator_process_assignments_admin" ON "public"."operator_process_assignments" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "operator_process_assignments_read" ON "public"."operator_process_assignments" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."operator_skills" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "operator_skills_admin" ON "public"."operator_skills" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "operator_skills_read" ON "public"."operator_skills" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."operators" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "operators_admin_write" ON "public"."operators" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "operators_select_roster" ON "public"."operators" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."process_skill_requirements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "process_skill_requirements_admin" ON "public"."process_skill_requirements" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "process_skill_requirements_read" ON "public"."process_skill_requirements" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."processes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "processes_admin" ON "public"."processes" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "processes_read" ON "public"."processes" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."product_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_lines_all" ON "public"."product_lines" USING (true) WITH CHECK (true);



ALTER TABLE "public"."production_targets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "production_targets_admin" ON "public"."production_targets" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "production_targets_read" ON "public"."production_targets" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_admin" ON "public"."products" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "products_read" ON "public"."products" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admin_all" ON "public"."profiles" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "profiles_self_select" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")));



CREATE POLICY "profiles_self_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."ref_autonomous_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ref_autonomous_categories_admin" ON "public"."ref_autonomous_categories" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "ref_autonomous_categories_read" ON "public"."ref_autonomous_categories" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."ref_autonomous_frequencies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ref_autonomous_frequencies_admin" ON "public"."ref_autonomous_frequencies" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "ref_autonomous_frequencies_read" ON "public"."ref_autonomous_frequencies" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."ref_downtime_classes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ref_downtime_classes_admin" ON "public"."ref_downtime_classes" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "ref_downtime_classes_read" ON "public"."ref_downtime_classes" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."ref_ng_classes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ref_ng_classes_admin" ON "public"."ref_ng_classes" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "ref_ng_classes_read" ON "public"."ref_ng_classes" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."ref_product_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ref_product_categories_admin" ON "public"."ref_product_categories" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "ref_product_categories_read" ON "public"."ref_product_categories" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."shift_breaks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shift_breaks_admin" ON "public"."shift_breaks" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "shift_breaks_read" ON "public"."shift_breaks" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."shift_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shift_runs_delete" ON "public"."shift_runs" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "shift_runs_insert" ON "public"."shift_runs" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'leader'::"public"."app_role")));



CREATE POLICY "shift_runs_read" ON "public"."shift_runs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "shift_runs_update" ON "public"."shift_runs" FOR UPDATE TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'leader'::"public"."app_role"))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'leader'::"public"."app_role")));



ALTER TABLE "public"."shifts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shifts_admin" ON "public"."shifts" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "shifts_read" ON "public"."shifts" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."skills" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "skills_admin" ON "public"."skills" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "skills_read" ON "public"."skills" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."sub_processes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sub_processes_admin" ON "public"."sub_processes" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "sub_processes_read" ON "public"."sub_processes" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_admin_write" ON "public"."user_roles" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "user_roles_self_select" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."check_sheet_results";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."downtime_entries";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."eosr_reports";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."hourly_outputs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ng_entries";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."shift_runs";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_roles"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_roles"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."hash_operator_pin"("pin" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."hash_operator_pin"("pin" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hash_operator_pin"("pin" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."run_is_active"("_run_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."run_is_active"("_run_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_is_active"("_run_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_shift_break_minutes"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_shift_break_minutes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_shift_break_minutes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."verify_operator_pin"("p_operator_id" "uuid", "p_pin" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."verify_operator_pin"("p_operator_id" "uuid", "p_pin" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_operator_pin"("p_operator_id" "uuid", "p_pin" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."autonomous_check_items" TO "anon";
GRANT ALL ON TABLE "public"."autonomous_check_items" TO "authenticated";
GRANT ALL ON TABLE "public"."autonomous_check_items" TO "service_role";



GRANT ALL ON TABLE "public"."check_sheet_results" TO "anon";
GRANT ALL ON TABLE "public"."check_sheet_results" TO "authenticated";
GRANT ALL ON TABLE "public"."check_sheet_results" TO "service_role";



GRANT ALL ON TABLE "public"."check_sheet_templates" TO "anon";
GRANT ALL ON TABLE "public"."check_sheet_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."check_sheet_templates" TO "service_role";



GRANT ALL ON TABLE "public"."defect_types" TO "anon";
GRANT ALL ON TABLE "public"."defect_types" TO "authenticated";
GRANT ALL ON TABLE "public"."defect_types" TO "service_role";



GRANT ALL ON TABLE "public"."downtime_categories" TO "anon";
GRANT ALL ON TABLE "public"."downtime_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."downtime_categories" TO "service_role";



GRANT ALL ON TABLE "public"."downtime_entries" TO "anon";
GRANT ALL ON TABLE "public"."downtime_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."downtime_entries" TO "service_role";



GRANT ALL ON TABLE "public"."eosr_reports" TO "anon";
GRANT ALL ON TABLE "public"."eosr_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."eosr_reports" TO "service_role";



GRANT ALL ON TABLE "public"."fivef5l_check_items" TO "anon";
GRANT ALL ON TABLE "public"."fivef5l_check_items" TO "authenticated";
GRANT ALL ON TABLE "public"."fivef5l_check_items" TO "service_role";



GRANT ALL ON TABLE "public"."group_leaders" TO "anon";
GRANT ALL ON TABLE "public"."group_leaders" TO "authenticated";
GRANT ALL ON TABLE "public"."group_leaders" TO "service_role";



GRANT ALL ON TABLE "public"."group_process_assignments" TO "anon";
GRANT ALL ON TABLE "public"."group_process_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."group_process_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."hourly_outputs" TO "anon";
GRANT ALL ON TABLE "public"."hourly_outputs" TO "authenticated";
GRANT ALL ON TABLE "public"."hourly_outputs" TO "service_role";



GRANT ALL ON TABLE "public"."lines" TO "anon";
GRANT ALL ON TABLE "public"."lines" TO "authenticated";
GRANT ALL ON TABLE "public"."lines" TO "service_role";



GRANT ALL ON TABLE "public"."ng_entries" TO "anon";
GRANT ALL ON TABLE "public"."ng_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."ng_entries" TO "service_role";



GRANT ALL ON TABLE "public"."operator_line_assignments" TO "anon";
GRANT ALL ON TABLE "public"."operator_line_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."operator_line_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."operator_process_assignments" TO "anon";
GRANT ALL ON TABLE "public"."operator_process_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."operator_process_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."operator_skills" TO "anon";
GRANT ALL ON TABLE "public"."operator_skills" TO "authenticated";
GRANT ALL ON TABLE "public"."operator_skills" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."operators" TO "anon";
GRANT ALL ON TABLE "public"."operators" TO "authenticated";
GRANT ALL ON TABLE "public"."operators" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."operators" TO "authenticated";



GRANT SELECT("full_name") ON TABLE "public"."operators" TO "authenticated";



GRANT SELECT("employee_code") ON TABLE "public"."operators" TO "authenticated";



GRANT SELECT("role") ON TABLE "public"."operators" TO "authenticated";



GRANT SELECT("initials") ON TABLE "public"."operators" TO "authenticated";



GRANT SELECT("avatar_color") ON TABLE "public"."operators" TO "authenticated";



GRANT SELECT("active") ON TABLE "public"."operators" TO "authenticated";



GRANT SELECT("join_date") ON TABLE "public"."operators" TO "authenticated";



GRANT SELECT("photo_url") ON TABLE "public"."operators" TO "authenticated";



GRANT SELECT("position") ON TABLE "public"."operators" TO "authenticated";



GRANT SELECT("supervisor_id") ON TABLE "public"."operators" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."operators" TO "authenticated";



GRANT SELECT("updated_at") ON TABLE "public"."operators" TO "authenticated";



GRANT ALL ON TABLE "public"."operators_public" TO "anon";
GRANT ALL ON TABLE "public"."operators_public" TO "authenticated";
GRANT ALL ON TABLE "public"."operators_public" TO "service_role";



GRANT ALL ON TABLE "public"."process_skill_requirements" TO "anon";
GRANT ALL ON TABLE "public"."process_skill_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."process_skill_requirements" TO "service_role";



GRANT ALL ON TABLE "public"."processes" TO "anon";
GRANT ALL ON TABLE "public"."processes" TO "authenticated";
GRANT ALL ON TABLE "public"."processes" TO "service_role";



GRANT ALL ON TABLE "public"."product_lines" TO "anon";
GRANT ALL ON TABLE "public"."product_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."product_lines" TO "service_role";



GRANT ALL ON TABLE "public"."production_targets" TO "anon";
GRANT ALL ON TABLE "public"."production_targets" TO "authenticated";
GRANT ALL ON TABLE "public"."production_targets" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."ref_autonomous_categories" TO "anon";
GRANT ALL ON TABLE "public"."ref_autonomous_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."ref_autonomous_categories" TO "service_role";



GRANT ALL ON TABLE "public"."ref_autonomous_frequencies" TO "anon";
GRANT ALL ON TABLE "public"."ref_autonomous_frequencies" TO "authenticated";
GRANT ALL ON TABLE "public"."ref_autonomous_frequencies" TO "service_role";



GRANT ALL ON TABLE "public"."ref_downtime_classes" TO "anon";
GRANT ALL ON TABLE "public"."ref_downtime_classes" TO "authenticated";
GRANT ALL ON TABLE "public"."ref_downtime_classes" TO "service_role";



GRANT ALL ON TABLE "public"."ref_ng_classes" TO "anon";
GRANT ALL ON TABLE "public"."ref_ng_classes" TO "authenticated";
GRANT ALL ON TABLE "public"."ref_ng_classes" TO "service_role";



GRANT ALL ON TABLE "public"."ref_product_categories" TO "anon";
GRANT ALL ON TABLE "public"."ref_product_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."ref_product_categories" TO "service_role";



GRANT ALL ON TABLE "public"."shift_breaks" TO "anon";
GRANT ALL ON TABLE "public"."shift_breaks" TO "authenticated";
GRANT ALL ON TABLE "public"."shift_breaks" TO "service_role";



GRANT ALL ON TABLE "public"."shift_runs" TO "anon";
GRANT ALL ON TABLE "public"."shift_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."shift_runs" TO "service_role";



GRANT ALL ON TABLE "public"."shifts" TO "anon";
GRANT ALL ON TABLE "public"."shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."shifts" TO "service_role";



GRANT ALL ON TABLE "public"."skills" TO "anon";
GRANT ALL ON TABLE "public"."skills" TO "authenticated";
GRANT ALL ON TABLE "public"."skills" TO "service_role";



GRANT ALL ON TABLE "public"."sub_processes" TO "anon";
GRANT ALL ON TABLE "public"."sub_processes" TO "authenticated";
GRANT ALL ON TABLE "public"."sub_processes" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































