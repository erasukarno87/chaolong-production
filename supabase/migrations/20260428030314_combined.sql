-- =============================================================================
-- COMBINED MIGRATION — prod-system-chaolong
-- Merged from:
--   20260428025537  auth, profiles, user_roles, operators, core functions
--   20260428025558  function grants / revokes
--   20260428030029  master tables (lines, products, processes, shifts, targets)
--   20260428030314  production tables, policies, realtime, seed data
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1 · AUTH, PROFILES, OPERATORS, CORE FUNCTIONS
-- (originally 20260428025537)
-- =============================================================================

CREATE TYPE public.app_role AS ENUM ('super_admin', 'leader', 'operator', 'viewer');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS SETOF public.app_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
$$;

CREATE TABLE public.operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  employee_code TEXT UNIQUE,
  role public.app_role NOT NULL DEFAULT 'operator',
  pin_hash TEXT NOT NULL,
  initials TEXT,
  avatar_color TEXT DEFAULT '#1A6EFA',
  active BOOLEAN NOT NULL DEFAULT true,
  assigned_line_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_operators_updated_at BEFORE UPDATE ON public.operators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Policies: profiles
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Policies: user_roles
CREATE POLICY "user_roles_self_select" ON public.user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "user_roles_admin_write" ON public.user_roles FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Policies: operators
CREATE POLICY "operators_select_roster" ON public.operators FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "operators_admin_write" ON public.operators FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE VIEW public.operators_public WITH (security_invoker = true) AS
SELECT id, full_name, employee_code, role, initials, avatar_color, active, assigned_line_ids, created_at
FROM public.operators;

REVOKE SELECT ON public.operators FROM anon;
GRANT SELECT (id, full_name, employee_code, role, initials, avatar_color, active, assigned_line_ids, created_at, updated_at)
  ON public.operators TO authenticated;
GRANT SELECT ON public.operators_public TO authenticated, anon;

-- =============================================================================
-- SECTION 2 · FUNCTION GRANTS / REVOKES
-- (originally 20260428025558)
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_roles() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- SECTION 3 · MASTER TABLES: LINES, PRODUCTS, PROCESSES, SHIFTS, TARGETS
-- (originally 20260428030029)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash a PIN using bcrypt (replaces hash-operator-pin Edge Function).
CREATE OR REPLACE FUNCTION public.hash_operator_pin(pin TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN extensions.crypt(pin, extensions.gen_salt('bf', 10));
END; $$;

-- Verify an operator's PIN and return their public profile as JSON.
-- Replaces verify-operator-pin Edge Function.
CREATE OR REPLACE FUNCTION public.verify_operator_pin(p_operator_id UUID, p_pin TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  op RECORD;
BEGIN
  SELECT id, full_name, employee_code, role, initials, avatar_color, active, assigned_line_ids, pin_hash
  INTO op FROM public.operators
  WHERE id = p_operator_id AND active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'not_found');
  END IF;
  IF op.pin_hash IS NULL OR op.pin_hash <> extensions.crypt(p_pin, op.pin_hash) THEN
    RETURN json_build_object('error', 'invalid_pin');
  END IF;
  RETURN json_build_object('operator', json_build_object(
    'id',               op.id,
    'full_name',        op.full_name,
    'employee_code',    op.employee_code,
    'role',             op.role,
    'initials',         op.initials,
    'avatar_color',     op.avatar_color,
    'active',           op.active,
    'assigned_line_ids', op.assigned_line_ids
  ));
END; $$;

REVOKE EXECUTE ON FUNCTION public.hash_operator_pin(TEXT)         FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.hash_operator_pin(TEXT)         TO authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_operator_pin(UUID, TEXT)  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.verify_operator_pin(UUID, TEXT)  TO authenticated;

-- LINES
CREATE TABLE public.lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lines ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_lines_updated BEFORE UPDATE ON public.lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  model TEXT,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SKILLS (master kompetensi)
CREATE TABLE public.skills (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  description TEXT,
  sort_order  INT     NOT NULL DEFAULT 10,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- PROCESSES / POS / WORKSTATION (per lini produksi)
CREATE TABLE public.processes (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id             UUID    REFERENCES public.lines(id) ON DELETE CASCADE,
  code                TEXT    NOT NULL,
  name                TEXT    NOT NULL,
  sort_order          INT     NOT NULL DEFAULT 10,
  cycle_time_seconds  NUMERIC(10,2) CHECK (cycle_time_seconds IS NULL OR cycle_time_seconds > 0),
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (line_id, code)
);
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

-- SUB-PROCESSES (dipertahankan untuk kompatibilitas)
CREATE TABLE public.sub_processes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  name       TEXT NOT NULL,
  sort_order INT  NOT NULL DEFAULT 0,
  UNIQUE (process_id, code)
);
ALTER TABLE public.sub_processes ENABLE ROW LEVEL SECURITY;

-- PROCESS SKILL REQUIREMENTS (many-to-many: workstation ↔ skill)
CREATE TABLE public.process_skill_requirements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  skill_id   UUID NOT NULL REFERENCES public.skills(id)   ON DELETE CASCADE,
  min_level  INT  NOT NULL DEFAULT 2 CHECK (min_level BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (process_id, skill_id)
);
ALTER TABLE public.process_skill_requirements ENABLE ROW LEVEL SECURITY;

-- SHIFTS
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INT NOT NULL DEFAULT 60,
  active BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- TARGETS
CREATE TABLE public.production_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  man_power INT NOT NULL DEFAULT 1 CHECK (man_power >= 1),
  target_qty INT NOT NULL,
  hourly_target INT,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (line_id, product_id, shift_id, man_power, effective_from)
);
ALTER TABLE public.production_targets ENABLE ROW LEVEL SECURITY;

-- Policies: read for authenticated, write for super_admin
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['lines','products','processes','sub_processes','shifts','production_targets','skills','process_skill_requirements']
  LOOP
    EXECUTE format('CREATE POLICY "%I_read" ON public.%I FOR SELECT TO authenticated USING (true)', t||'_read', t);
    EXECUTE format('CREATE POLICY "%I_admin" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''super_admin'')) WITH CHECK (public.has_role(auth.uid(), ''super_admin''))', t||'_admin', t);
  END LOOP;
END $$;

-- SEED: master reference data
INSERT INTO public.lines (code, name, description) VALUES
  ('LINE-A', 'LINE A — Commun. Cont. Unit', 'Assembly line untuk MCU CB150'),
  ('LINE-B', 'LINE B — ECU Sub-Assembly',   'Sub-assembly ECU')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.products (code, name, model, description) VALUES
  ('MCU-001', 'ECU CB150', 'B6Y-12', 'Engine Control Unit untuk Honda CB150'),
  ('ECU-002', 'ECU Vario 160', 'V16-A', 'Engine Control Unit untuk Honda Vario 160')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.processes (code, name, sort_order) VALUES
  ('SOLDER',   'Soldering',         10),
  ('CONFCOAT', 'Conformal Coat',    20),
  ('BTBETA',   'BT Burning Beta',   30),
  ('MCUFLASH', 'MCU Flash',         40),
  ('FINALFI',  'Final FI',          50),
  ('VISPACK',  'Visual & Pack',     60)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.shifts (code, name, start_time, end_time, break_minutes) VALUES
  ('S1', 'Shift 1', '07:00', '15:00', 60),
  ('S2', 'Shift 2', '15:00', '23:00', 60),
  ('S3', 'Shift 3', '23:00', '07:00', 60)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.production_targets (line_id, product_id, shift_id, man_power, target_qty, hourly_target)
SELECT l.id, p.id, s.id, 5, 1200, 150
FROM public.lines l, public.products p, public.shifts s
WHERE l.code = 'LINE-A' AND p.code = 'MCU-001' AND s.code = 'S1'
ON CONFLICT DO NOTHING;

-- SEED: sample operators (PIN default: 1234)
INSERT INTO public.operators (full_name, employee_code, role, pin_hash, initials, avatar_color, assigned_line_ids)
SELECT v.full_name, v.employee_code, v.role::public.app_role,
       crypt('1234', gen_salt('bf', 10)),
       v.initials, v.avatar_color,
       ARRAY(SELECT id FROM public.lines WHERE code = ANY(v.lines))::uuid[]
FROM (VALUES
  ('Budi Santoso',  'EMP-001', 'leader',   'BS', '#1A6EFA', ARRAY['LINE-A']),
  ('Siti Rahayu',   'EMP-002', 'leader',   'SR', '#00B37D', ARRAY['LINE-B']),
  ('Andi Pratama',  'EMP-003', 'operator', 'AP', '#F59E0B', ARRAY['LINE-A']),
  ('Dewi Lestari',  'EMP-004', 'operator', 'DL', '#8B5CF6', ARRAY['LINE-A']),
  ('Rudi Hartono',  'EMP-005', 'operator', 'RH', '#EF4444', ARRAY['LINE-A','LINE-B']),
  ('Maya Putri',    'EMP-006', 'operator', 'MP', '#0EA5E9', ARRAY['LINE-B']),
  ('Pak Hendro',    'EMP-007', 'viewer',   'PH', '#6B7280', ARRAY[]::text[])
) AS v(full_name, employee_code, role, initials, avatar_color, lines)
ON CONFLICT (employee_code) DO NOTHING;

-- =============================================================================
-- SECTION 4 · PRODUCTION TABLES, POLICIES, REALTIME, SEED DATA
-- (originally 20260428030314)
-- =============================================================================

-- MASTER LOOKUPS: defect types, downtime categories, check sheet templates
CREATE TABLE public.defect_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.defect_types ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.downtime_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_planned BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.downtime_categories ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.check_sheet_kind AS ENUM ('5F5L', 'AUTONOMOUS');

CREATE TABLE public.check_sheet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.check_sheet_kind NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (kind, code)
);
ALTER TABLE public.check_sheet_templates ENABLE ROW LEVEL SECURITY;

-- SHIFT RUNS
CREATE TYPE public.shift_run_status AS ENUM ('setup', 'running', 'completed', 'cancelled');

CREATE TABLE public.shift_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES public.lines(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  shift_id UUID NOT NULL REFERENCES public.shifts(id),
  leader_operator_id UUID REFERENCES public.operators(id),
  work_order TEXT,
  target_qty INT NOT NULL DEFAULT 0,
  hourly_target INT NOT NULL DEFAULT 0,
  status public.shift_run_status NOT NULL DEFAULT 'setup',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shift_runs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_shift_runs_updated BEFORE UPDATE ON public.shift_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_shift_runs_line_status ON public.shift_runs(line_id, status);
CREATE INDEX idx_shift_runs_started ON public.shift_runs(started_at DESC);

-- HOURLY OUTPUTS
CREATE TABLE public.hourly_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_run_id UUID NOT NULL REFERENCES public.shift_runs(id) ON DELETE CASCADE,
  hour_index INT NOT NULL,
  hour_label TEXT NOT NULL,
  actual_qty INT NOT NULL DEFAULT 0,
  ng_qty INT NOT NULL DEFAULT 0,
  downtime_minutes INT NOT NULL DEFAULT 0,
  is_break BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  recorded_by_operator_id UUID REFERENCES public.operators(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shift_run_id, hour_index)
);
ALTER TABLE public.hourly_outputs ENABLE ROW LEVEL SECURITY;

-- NG ENTRIES
CREATE TYPE public.ng_disposition AS ENUM ('rework', 'scrap', 'hold', 'accepted');

CREATE TABLE public.ng_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_run_id UUID NOT NULL REFERENCES public.shift_runs(id) ON DELETE CASCADE,
  defect_type_id UUID REFERENCES public.defect_types(id),
  sub_process_id UUID REFERENCES public.sub_processes(id),
  qty INT NOT NULL DEFAULT 1,
  disposition public.ng_disposition NOT NULL DEFAULT 'rework',
  found_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  found_by_operator_id UUID REFERENCES public.operators(id),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ng_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ng_run ON public.ng_entries(shift_run_id);

-- DOWNTIME ENTRIES
CREATE TYPE public.dt_kind AS ENUM ('planned', 'unplanned');

CREATE TABLE public.downtime_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_run_id UUID NOT NULL REFERENCES public.shift_runs(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.downtime_categories(id),
  kind public.dt_kind NOT NULL DEFAULT 'unplanned',
  duration_minutes INT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  root_cause TEXT,
  action_taken TEXT,
  recorded_by_operator_id UUID REFERENCES public.operators(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.downtime_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_dt_run ON public.downtime_entries(shift_run_id);

-- CHECK SHEET RESULTS
CREATE TABLE public.check_sheet_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_run_id UUID NOT NULL REFERENCES public.shift_runs(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.check_sheet_templates(id),
  passed BOOLEAN NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_by_operator_id UUID REFERENCES public.operators(id),
  note TEXT,
  UNIQUE (shift_run_id, template_id)
);
ALTER TABLE public.check_sheet_results ENABLE ROW LEVEL SECURITY;

-- EOSR REPORTS
CREATE TABLE public.eosr_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_run_id UUID UNIQUE NOT NULL REFERENCES public.shift_runs(id) ON DELETE CASCADE,
  total_actual INT NOT NULL DEFAULT 0,
  total_ng INT NOT NULL DEFAULT 0,
  total_downtime_min INT NOT NULL DEFAULT 0,
  achievement_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  oee_pct NUMERIC(5,2),
  notes TEXT,
  signed_by_name TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);
ALTER TABLE public.eosr_reports ENABLE ROW LEVEL SECURITY;

-- OPERATOR SKILLS
CREATE TABLE public.operator_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  level INT NOT NULL CHECK (level BETWEEN 0 AND 4),
  wi_pass BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (operator_id, process_id)
);
ALTER TABLE public.operator_skills ENABLE ROW LEVEL SECURITY;

-- POLICIES: master lookups
DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['defect_types','downtime_categories','check_sheet_templates','operator_skills']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t||'_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(),''super_admin'')) WITH CHECK (public.has_role(auth.uid(),''super_admin''))', t||'_admin', t);
  END LOOP;
END $$;

-- POLICIES: shift_runs
CREATE POLICY shift_runs_read ON public.shift_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY shift_runs_insert ON public.shift_runs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY shift_runs_update ON public.shift_runs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'leader'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY shift_runs_delete ON public.shift_runs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Helper: check if shift run is still active
CREATE OR REPLACE FUNCTION public.run_is_active(_run_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shift_runs WHERE id = _run_id AND status IN ('setup', 'running'))
$$;
REVOKE EXECUTE ON FUNCTION public.run_is_active(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.run_is_active(UUID) TO authenticated;

-- POLICIES: entry tables (hourly_outputs, ng_entries, downtime_entries, check_sheet_results)
CREATE POLICY hourly_read  ON public.hourly_outputs FOR SELECT TO authenticated USING (true);
CREATE POLICY hourly_write ON public.hourly_outputs FOR ALL    TO authenticated
  USING      (public.has_role(auth.uid(), 'super_admin') OR ((public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'operator')) AND public.run_is_active(shift_run_id)))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR ((public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'operator')) AND public.run_is_active(shift_run_id)));

CREATE POLICY ng_read  ON public.ng_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY ng_write ON public.ng_entries FOR ALL    TO authenticated
  USING      (public.has_role(auth.uid(), 'super_admin') OR ((public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'operator')) AND public.run_is_active(shift_run_id)))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR ((public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'operator')) AND public.run_is_active(shift_run_id)));

CREATE POLICY dt_read  ON public.downtime_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY dt_write ON public.downtime_entries FOR ALL    TO authenticated
  USING      (public.has_role(auth.uid(), 'super_admin') OR ((public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'operator')) AND public.run_is_active(shift_run_id)))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR ((public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'operator')) AND public.run_is_active(shift_run_id)));

CREATE POLICY cs_read  ON public.check_sheet_results FOR SELECT TO authenticated USING (true);
CREATE POLICY cs_write ON public.check_sheet_results FOR ALL    TO authenticated
  USING      (public.has_role(auth.uid(), 'super_admin') OR ((public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'operator')) AND public.run_is_active(shift_run_id)))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR ((public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'operator')) AND public.run_is_active(shift_run_id)));

-- POLICIES: EOSR — leader/admin only
CREATE POLICY eosr_read  ON public.eosr_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY eosr_write ON public.eosr_reports FOR ALL    TO authenticated
  USING      (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'leader'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'leader'));

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hourly_outputs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ng_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.downtime_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_sheet_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.eosr_reports;

-- SEED: defect types
INSERT INTO public.defect_types (code, name, category, sort_order) VALUES
  ('SHORT',    'MCU Short Circuit',      'Electrical', 10),
  ('SOLDBR',   'Solder Bridge',          'Solder',     20),
  ('SCRATCH',  'Visual Scratch',         'Visual',     30),
  ('LBLOFF',   'Label Paste Off',        'Visual',     40),
  ('COATMISS', 'Conformal Coat Missing', 'Coating',    50),
  ('BTFAIL',   'BT Fail',               'Test',       60),
  ('FIFAIL',   'Final FI Fail',         'Test',       70),
  ('DIMOOT',   'Dimension OOT',         'Mechanical', 80),
  ('MISSCOMP', 'Missing Component',     'Assembly',   90),
  ('OTHER',    'Other',                 'Other',      99)
ON CONFLICT (code) DO NOTHING;

-- SEED: downtime categories
INSERT INTO public.downtime_categories (code, name, is_planned, sort_order) VALUES
  ('BREAKDOWN',  'Breakdown Mesin',       false, 10),
  ('WAITMAT',    'Tunggu Material',       false, 20),
  ('CHANGEOVER', 'Changeover/Setup',      true,  30),
  ('QHOLD',      'Quality Hold',          false, 40),
  ('UTIL',       'Utility (Listrik/Air)', false, 50),
  ('OTHER_DT',   'Lainnya',               false, 99)
ON CONFLICT (code) DO NOTHING;

-- SEED: check sheet templates
INSERT INTO public.check_sheet_templates (kind, code, label, sort_order) VALUES
  ('5F5L',       '5F',  '5 First — Awal Shift Inspection', 10),
  ('5F5L',       '5L',  '5 Last — Akhir Shift Inspection',  20),
  ('AUTONOMOUS', 'AM1', 'Mesin First Function',             10),
  ('AUTONOMOUS', 'AM2', 'Label Printer',                    20),
  ('AUTONOMOUS', 'AM3', 'Mesin Auto Potting',               30),
  ('AUTONOMOUS', 'AM4', 'Mixing PU',                        40),
  ('AUTONOMOUS', 'AM5', 'Mesin Final Inspection',           50)
ON CONFLICT (kind, code) DO NOTHING;

-- SEED: sub-processes
INSERT INTO public.sub_processes (process_id, code, name, sort_order)
SELECT p.id, sp.code, sp.name, sp.sort_order
FROM public.processes p
JOIN (VALUES
  ('BTBETA',   'BT-1', 'BT Burning Beta', 10),
  ('MCUFLASH', 'MF-1', 'MCU Flash',       10),
  ('FINALFI',  'FI-1', 'Final FI',        10),
  ('VISPACK',  'VP-1', 'Visual & Pack',   10),
  ('SOLDER',   'SD-1', 'Soldering',       10),
  ('CONFCOAT', 'CC-1', 'Conformal Coat',  10)
) AS sp(proc_code, code, name, sort_order) ON sp.proc_code = p.code
ON CONFLICT (process_id, code) DO NOTHING;

-- SEED: operator skill matrix (deterministic via hash)
INSERT INTO public.operator_skills (operator_id, process_id, level, wi_pass)
SELECT o.id, p.id,
       (abs(hashtext(o.full_name || p.code)) % 5)::int,
       (abs(hashtext(o.full_name || p.code)) % 4) <> 0
FROM public.operators o
CROSS JOIN public.processes p
ON CONFLICT (operator_id, process_id) DO NOTHING;

COMMIT;
