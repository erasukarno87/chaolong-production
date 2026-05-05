-- =============================================================================
-- RESET + RECREATE — untuk Supabase Cloud SQL Editor
-- Copy-paste seluruh file ini ke SQL Editor lalu klik RUN.
-- Akan DROP semua object lama (CASCADE) lalu CREATE ulang dari awal.
-- =============================================================================

-- =============================================================================
-- BAGIAN 1 · DROP SEMUA OBJECT (urutan terbalik dari dependency)
-- =============================================================================

-- Trigger on auth.users (eksplisit karena auth.users tidak di-DROP)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- NOTE: triggers di public tables (profiles, operators, lines, products, shift_runs)
-- tidak perlu di-DROP eksplisit — DROP TABLE ... CASCADE di bawah sudah menghapusnya.
-- Explicit DROP TRIGGER ON <table> akan error jika tabel belum ada (fresh DB).

-- Views
DROP VIEW IF EXISTS public.operators_public CASCADE;

-- Tables (leaf → root, CASCADE handles lingering FK refs)
DROP TABLE IF EXISTS public.eosr_reports               CASCADE;
DROP TABLE IF EXISTS public.check_sheet_results        CASCADE;
DROP TABLE IF EXISTS public.downtime_entries           CASCADE;
DROP TABLE IF EXISTS public.ng_entries                 CASCADE;
DROP TABLE IF EXISTS public.hourly_outputs             CASCADE;
DROP TABLE IF EXISTS public.shift_runs                 CASCADE;
DROP TABLE IF EXISTS public.operator_skills            CASCADE;
DROP TABLE IF EXISTS public.group_process_assignments   CASCADE;
DROP TABLE IF EXISTS public.group_leaders               CASCADE;
DROP TABLE IF EXISTS public.groups                      CASCADE;
DROP TABLE IF EXISTS public.operator_process_assignments CASCADE;
DROP TABLE IF EXISTS public.operator_line_assignments  CASCADE;
DROP TABLE IF EXISTS public.process_skill_requirements CASCADE;
DROP TABLE IF EXISTS public.check_sheet_templates      CASCADE;
DROP TABLE IF EXISTS public.autonomous_check_items    CASCADE;
DROP TABLE IF EXISTS public.ref_product_categories     CASCADE;
DROP TABLE IF EXISTS public.ref_ng_classes             CASCADE;
DROP TABLE IF EXISTS public.ref_downtime_classes       CASCADE;
DROP TABLE IF EXISTS public.ref_autonomous_categories  CASCADE;
DROP TABLE IF EXISTS public.ref_autonomous_frequencies CASCADE;
DROP TABLE IF EXISTS public.downtime_categories        CASCADE;
DROP TABLE IF EXISTS public.defect_types               CASCADE;
DROP TABLE IF EXISTS public.production_targets         CASCADE;
DROP TABLE IF EXISTS public.shift_breaks               CASCADE;
DROP TABLE IF EXISTS public.sub_processes              CASCADE;
DROP TABLE IF EXISTS public.processes                  CASCADE;
DROP TABLE IF EXISTS public.skills                     CASCADE;
DROP TABLE IF EXISTS public.shifts                     CASCADE;
DROP TABLE IF EXISTS public.products                   CASCADE;
DROP TABLE IF EXISTS public.lines                      CASCADE;
DROP TABLE IF EXISTS public.operators                  CASCADE;
DROP TABLE IF EXISTS public.user_roles                 CASCADE;
DROP TABLE IF EXISTS public.profiles                   CASCADE;

-- Functions
DROP FUNCTION IF EXISTS public.run_is_active(UUID)              CASCADE;
DROP FUNCTION IF EXISTS public.hash_operator_pin(TEXT)          CASCADE;
DROP FUNCTION IF EXISTS public.verify_operator_pin(UUID, TEXT)  CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user()                CASCADE;
DROP FUNCTION IF EXISTS public.sync_shift_break_minutes()       CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column()       CASCADE;
DROP FUNCTION IF EXISTS public.get_my_roles()                   CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role)  CASCADE;

-- Types (setelah semua table & function sudah di-drop)
DROP TYPE IF EXISTS public.dt_kind           CASCADE;
DROP TYPE IF EXISTS public.ng_disposition    CASCADE;
DROP TYPE IF EXISTS public.shift_run_status  CASCADE;
DROP TYPE IF EXISTS public.check_sheet_kind  CASCADE;
DROP TYPE IF EXISTS public.app_role          CASCADE;

-- =============================================================================
-- BAGIAN 2 · RECREATE SEMUA OBJECT
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SECTION 1 · AUTH, PROFILES, OPERATORS, CORE FUNCTIONS
-- ---------------------------------------------------------------------------

CREATE TYPE public.app_role AS ENUM ('super_admin', 'leader', 'supervisor', 'manager');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  username TEXT,                          -- untuk login tanpa email (staff/leader)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_profiles_username_lower
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;
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

-- RPC: ambil email berdasarkan username — callable by anon (untuk staff login)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM   public.profiles
  WHERE  lower(username) = lower(p_username)
  LIMIT  1;
$$;

-- ---------------------------------------------------------------------------
-- Operators table — shop-floor workers (no auth link; leader identity via profiles)
-- ---------------------------------------------------------------------------
CREATE TABLE public.operators (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT            NOT NULL,
  employee_code TEXT            UNIQUE,
  role          public.app_role NOT NULL DEFAULT 'leader',
  initials      TEXT,
  avatar_color  TEXT            DEFAULT '#1A6EFA',
  active        BOOLEAN         NOT NULL DEFAULT true,
  -- Extended profile
  join_date     DATE,
  photo_url     TEXT,
  position      TEXT,
  supervisor_id UUID            REFERENCES public.operators(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT now()
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
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'manager');
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

-- NOTE: operators_public VIEW created later in SECTION 3 (after operator_line_assignments exists)

REVOKE SELECT ON public.operators FROM anon;
GRANT SELECT (id, full_name, employee_code, role, initials, avatar_color, active,
              join_date, photo_url, position, supervisor_id, created_at, updated_at)
  ON public.operators TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.operators TO authenticated;

-- ---------------------------------------------------------------------------
-- SECTION 2 · FUNCTION GRANTS / REVOKES
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_roles() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()          FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_email_by_username(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- SECTION 3 · MASTER TABLES, RPC FUNCTIONS, ASSIGNMENT TABLES
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Master reference tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.lines (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lines ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_lines_updated BEFORE UPDATE ON public.lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.products (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  model       TEXT,
  category    TEXT,                           -- e.g. CCU, Fuel Sender, Speedometer Digital
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Skills master (kompetensi/keahlian)
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

-- POS / Workstation
CREATE TABLE public.processes (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id            UUID    REFERENCES public.lines(id) ON DELETE CASCADE,
  code               TEXT    NOT NULL,
  name               TEXT    NOT NULL,
  sort_order         INT     NOT NULL DEFAULT 10,
  cycle_time_seconds NUMERIC(10,2) CHECK (cycle_time_seconds IS NULL OR cycle_time_seconds > 0),
  active             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (line_id, code)
);
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

-- Sub-proses (kompatibilitas)
CREATE TABLE public.sub_processes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  name       TEXT NOT NULL,
  sort_order INT  NOT NULL DEFAULT 0,
  UNIQUE (process_id, code)
);
ALTER TABLE public.sub_processes ENABLE ROW LEVEL SECURITY;

-- Skill requirements per POS/Workstation
CREATE TABLE public.process_skill_requirements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  skill_id   UUID NOT NULL REFERENCES public.skills(id)   ON DELETE CASCADE,
  min_level  INT  NOT NULL DEFAULT 2 CHECK (min_level BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (process_id, skill_id)
);
ALTER TABLE public.process_skill_requirements ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Operator placement tables (menggantikan assigned_line_ids array)
-- ---------------------------------------------------------------------------

-- LINE assignment per operator (boleh lebih dari 1 default)
CREATE TABLE public.operator_line_assignments (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID    NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  line_id     UUID    NOT NULL REFERENCES public.lines(id)     ON DELETE CASCADE,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (operator_id, line_id)
);
-- (index ola_one_default_per_op dihapus — operator boleh punya > 1 default line)
ALTER TABLE public.operator_line_assignments ENABLE ROW LEVEL SECURITY;

-- POS/Workstation assignment per operator (boleh lebih dari 1 default)
CREATE TABLE public.operator_process_assignments (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID    NOT NULL REFERENCES public.operators(id)  ON DELETE CASCADE,
  process_id  UUID    NOT NULL REFERENCES public.processes(id)  ON DELETE CASCADE,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (operator_id, process_id)
);
-- (index opa_one_default_per_op dihapus — operator boleh punya > 1 default workstation)
ALTER TABLE public.operator_process_assignments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- operators_public VIEW — includes computed assigned_line_ids (backward-compat)
-- ---------------------------------------------------------------------------
CREATE VIEW public.operators_public WITH (security_invoker = true) AS
SELECT
  o.id,
  o.full_name,
  o.employee_code,
  o.role,
  o.initials,
  o.avatar_color,
  o.active,
  o.join_date,
  o.photo_url,
  o.position,
  o.supervisor_id,
  o.created_at,
  COALESCE(
    ARRAY(
      SELECT line_id FROM public.operator_line_assignments
      WHERE  operator_id = o.id
      ORDER  BY is_default DESC, created_at ASC
    ),
    ARRAY[]::UUID[]
  ) AS assigned_line_ids
FROM public.operators o;

GRANT SELECT ON public.operators_public TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- Shifts & Production Targets
-- ---------------------------------------------------------------------------

CREATE TABLE public.shifts (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT    NOT NULL UNIQUE,
  name          TEXT    NOT NULL,
  start_time    TIME    NOT NULL,
  end_time      TIME    NOT NULL,
  break_minutes INT     NOT NULL DEFAULT 0,  -- auto-synced from SUM(shift_breaks.duration_minutes)
  active        BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Break intervals per shift (max 3), auto-syncs shifts.break_minutes via trigger
CREATE TABLE public.shift_breaks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id         UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  break_order      INT  NOT NULL CHECK (break_order BETWEEN 1 AND 3),
  start_time       TIME NOT NULL,
  duration_minutes INT  NOT NULL CHECK (duration_minutes > 0),
  label            TEXT NOT NULL DEFAULT 'Istirahat',
  UNIQUE (shift_id, break_order)
);
ALTER TABLE public.shift_breaks ENABLE ROW LEVEL SECURITY;

-- Trigger: keep shifts.break_minutes = SUM(shift_breaks.duration_minutes)
CREATE OR REPLACE FUNCTION public.sync_shift_break_minutes()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
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
CREATE TRIGGER tg_sync_break_minutes
  AFTER INSERT OR UPDATE OR DELETE ON public.shift_breaks
  FOR EACH ROW EXECUTE FUNCTION public.sync_shift_break_minutes();

-- ---------------------------------------------------------------------------
-- Groups — regu per Line (bebas rotasi shift, tidak terikat ke 1 Shift)
-- ---------------------------------------------------------------------------
CREATE TABLE public.groups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id    UUID        NOT NULL REFERENCES public.lines(id)   ON DELETE CASCADE,
  code       TEXT        NOT NULL,
  sort_order INT         NOT NULL DEFAULT 0,
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (line_id, code)
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups_read"  ON public.groups FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "groups_write" ON public.groups FOR ALL    USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

CREATE TABLE public.group_leaders (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES public.groups(id)    ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
ALTER TABLE public.group_leaders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_leaders_read"  ON public.group_leaders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "group_leaders_write" ON public.group_leaders FOR ALL    USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- Formasi default: operator → POS per Group
-- Multi-operator per POS (multitasking) dan multi-POS per operator diizinkan
CREATE TABLE public.group_process_assignments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES public.groups(id)    ON DELETE CASCADE,
  process_id  UUID        NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  operator_id UUID        NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, process_id, operator_id)
);
ALTER TABLE public.group_process_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gpa_read"  ON public.group_process_assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "gpa_write" ON public.group_process_assignments FOR ALL    USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

CREATE INDEX idx_groups_line       ON public.groups                    (line_id);
CREATE INDEX idx_gl_group          ON public.group_leaders             (group_id);
CREATE INDEX idx_gl_user           ON public.group_leaders             (user_id);
CREATE INDEX idx_gpa_group         ON public.group_process_assignments (group_id);
CREATE INDEX idx_gpa_group_process ON public.group_process_assignments (group_id, process_id);

CREATE TABLE public.production_targets (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id            UUID         NOT NULL REFERENCES public.lines(id)    ON DELETE CASCADE,
  product_id         UUID         NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  shift_id           UUID         NOT NULL REFERENCES public.shifts(id)   ON DELETE CASCADE,
  man_power          INT          NOT NULL DEFAULT 1 CHECK (man_power >= 1),
  target_qty         INT          NOT NULL,
  hourly_target      INT,
  cycle_time_seconds NUMERIC(10,2) CHECK (cycle_time_seconds IS NULL OR cycle_time_seconds > 0),
  effective_from     DATE         NOT NULL DEFAULT CURRENT_DATE,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (line_id, product_id, shift_id, man_power, effective_from)
);
ALTER TABLE public.production_targets ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policies: master + placement tables
-- ---------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'lines','products','processes','sub_processes','shifts','shift_breaks','production_targets',
    'skills','process_skill_requirements',
    'operator_line_assignments','operator_process_assignments'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY "%s_read" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_admin" ON public.%I FOR ALL TO authenticated '
      'USING (public.has_role(auth.uid(),''super_admin'')) '
      'WITH CHECK (public.has_role(auth.uid(),''super_admin''))', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- SEED: master reference data
-- ---------------------------------------------------------------------------

INSERT INTO public.lines (code, name, description) VALUES
  ('LINE-A', 'LINE A — Commun. Cont. Unit', 'Assembly line untuk MCU CB150'),
  ('LINE-B', 'LINE B — ECU Sub-Assembly',   'Sub-assembly ECU')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.products (code, name, model, description) VALUES
  ('MCU-001', 'ECU CB150',     'B6Y-12', 'Engine Control Unit untuk Honda CB150'),
  ('ECU-002', 'ECU Vario 160', 'V16-A',  'Engine Control Unit untuk Honda Vario 160')
ON CONFLICT (code) DO NOTHING;

-- SEED: skills master
INSERT INTO public.skills (code, name, description, sort_order) VALUES
  ('SKL-01', 'Visual Inspection', 'Pemeriksaan visual produk',        10),
  ('SKL-02', 'Soldering',         'Penyolderan komponen elektronik',  20),
  ('SKL-03', 'Assembly',          'Perakitan komponen mekanik',       30),
  ('SKL-04', 'Machine Operation', 'Pengoperasian mesin produksi',     40),
  ('SKL-05', 'Quality Control',   'Kontrol kualitas dan pengukuran',  50)
ON CONFLICT (code) DO NOTHING;

-- SEED: workstations LINE-A
INSERT INTO public.processes (line_id, code, name, sort_order, cycle_time_seconds)
SELECT l.id, v.code, v.name, v.sort_order, v.cts
FROM public.lines l,
  (VALUES
    ('WS-01', 'Preparation',      10, 30.0),
    ('WS-02', 'Assembly',         20, 45.5),
    ('WS-03', 'Soldering',        30, 60.0),
    ('WS-04', 'Visual Check',     40, 20.5),
    ('WS-05', 'Final Inspection', 50, 25.0)
  ) AS v(code, name, sort_order, cts)
WHERE l.code = 'LINE-A'
ON CONFLICT (line_id, code) DO NOTHING;

-- SEED: skill requirements per workstation
INSERT INTO public.process_skill_requirements (process_id, skill_id, min_level)
SELECT p.id, s.id, req.min_level
FROM public.processes p
JOIN public.lines l ON l.id = p.line_id AND l.code = 'LINE-A'
JOIN (VALUES
  ('WS-02', 'SKL-03', 1),
  ('WS-03', 'SKL-02', 2),
  ('WS-03', 'SKL-04', 1),
  ('WS-04', 'SKL-01', 2),
  ('WS-05', 'SKL-01', 3),
  ('WS-05', 'SKL-05', 2)
) AS req(ws_code, skill_code, min_level) ON req.ws_code = p.code
JOIN public.skills s ON s.code = req.skill_code
ON CONFLICT (process_id, skill_id) DO NOTHING;

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

-- SEED: sample operators
INSERT INTO public.operators (full_name, employee_code, role, initials, avatar_color, position, join_date)
SELECT v.full_name, v.employee_code, v.role::public.app_role,
       v.initials, v.avatar_color, v.position, v.join_date::DATE
FROM (VALUES
  ('Budi Santoso', 'EMP-001', 'leader',     'BS', '#1A6EFA', 'Team Leader Line A', '2021-01-15'),
  ('Siti Rahayu',  'EMP-002', 'leader',     'SR', '#00B37D', 'Team Leader Line B', '2021-03-01'),
  ('Andi Pratama', 'EMP-003', 'leader',     'AP', '#F59E0B', 'Operator Senior',    '2022-06-10'),
  ('Dewi Lestari', 'EMP-004', 'leader',     'DL', '#8B5CF6', 'Operator',           '2023-01-05'),
  ('Rudi Hartono', 'EMP-005', 'leader',     'RH', '#EF4444', 'Operator Senior',    '2022-08-20'),
  ('Maya Putri',   'EMP-006', 'leader',     'MP', '#0EA5E9', 'Operator',           '2023-04-01'),
  ('Pak Hendro',   'EMP-007', 'supervisor', 'PH', '#6B7280', 'QC Inspector',       '2020-05-01')
) AS v(full_name, employee_code, role, initials, avatar_color, position, join_date)
ON CONFLICT (employee_code) DO NOTHING;

-- Set supervisors
UPDATE public.operators SET supervisor_id = (SELECT id FROM public.operators WHERE employee_code = 'EMP-001')
  WHERE employee_code IN ('EMP-003', 'EMP-004', 'EMP-005');
UPDATE public.operators SET supervisor_id = (SELECT id FROM public.operators WHERE employee_code = 'EMP-002')
  WHERE employee_code IN ('EMP-006');

-- SEED: operator line assignments
WITH asgn(emp_code, line_code, is_default) AS (VALUES
  ('EMP-001', 'LINE-A', true),
  ('EMP-002', 'LINE-B', true),
  ('EMP-003', 'LINE-A', true),
  ('EMP-004', 'LINE-A', true),
  ('EMP-005', 'LINE-A', true),
  ('EMP-005', 'LINE-B', false),
  ('EMP-006', 'LINE-B', true)
)
INSERT INTO public.operator_line_assignments (operator_id, line_id, is_default)
SELECT o.id, l.id, a.is_default
FROM asgn a
JOIN public.operators o ON o.employee_code = a.emp_code
JOIN public.lines     l ON l.code          = a.line_code
ON CONFLICT (operator_id, line_id) DO NOTHING;

-- SEED: operator process assignments
WITH asgn(emp_code, ws_code, is_default) AS (VALUES
  ('EMP-003', 'WS-01', true),
  ('EMP-003', 'WS-02', false),
  ('EMP-004', 'WS-03', true),
  ('EMP-004', 'WS-04', false),
  ('EMP-005', 'WS-04', true),
  ('EMP-005', 'WS-05', false)
)
INSERT INTO public.operator_process_assignments (operator_id, process_id, is_default)
SELECT o.id, p.id, a.is_default
FROM asgn a
JOIN public.operators o ON o.employee_code = a.emp_code
JOIN public.processes p ON p.code          = a.ws_code
JOIN public.lines     l ON l.id            = p.line_id AND l.code = 'LINE-A'
ON CONFLICT (operator_id, process_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- SECTION 4 · PRODUCTION TABLES, POLICIES, REALTIME, SEED DATA
-- ---------------------------------------------------------------------------

CREATE TABLE public.defect_types (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT    NOT NULL UNIQUE,
  name       TEXT    NOT NULL,
  category   TEXT,
  product_id UUID    REFERENCES public.products(id) ON DELETE CASCADE,  -- NULL = global
  active     BOOLEAN NOT NULL DEFAULT true,
  sort_order INT     NOT NULL DEFAULT 0
);
ALTER TABLE public.defect_types ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_defect_types_product ON public.defect_types(product_id);

CREATE TABLE public.downtime_categories (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  category    TEXT,                          -- Man / Machine / Method / Material / Environment
  description TEXT,
  is_planned  BOOLEAN NOT NULL DEFAULT false,
  active      BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT     NOT NULL DEFAULT 0
);
ALTER TABLE public.downtime_categories ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.check_sheet_kind AS ENUM ('5F5L', 'AUTONOMOUS');

CREATE TABLE public.check_sheet_templates (
  id         UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       public.check_sheet_kind NOT NULL,
  code       TEXT                    NOT NULL,
  label      TEXT                    NOT NULL,
  sort_order INT                     NOT NULL DEFAULT 0,
  active     BOOLEAN                 NOT NULL DEFAULT true,
  UNIQUE (kind, code)
);
ALTER TABLE public.check_sheet_templates ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.shift_run_status AS ENUM ('setup', 'running', 'completed', 'cancelled');

CREATE TABLE public.shift_runs (
  id                 UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id            UUID                    NOT NULL REFERENCES public.lines(id),
  product_id         UUID                    NOT NULL REFERENCES public.products(id),
  shift_id           UUID                    NOT NULL REFERENCES public.shifts(id),
  group_id           UUID                    REFERENCES public.groups(id) ON DELETE SET NULL,
  leader_user_id     UUID                    REFERENCES auth.users(id) ON DELETE SET NULL,
  work_order         TEXT,
  target_qty         INT                     NOT NULL DEFAULT 0,
  hourly_target      INT                     NOT NULL DEFAULT 0,
  status             public.shift_run_status NOT NULL DEFAULT 'setup',
  started_at         TIMESTAMPTZ,
  ended_at           TIMESTAMPTZ,
  notes              TEXT,
  created_by         UUID                    REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at         TIMESTAMPTZ             NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ             NOT NULL DEFAULT now()
);
ALTER TABLE public.shift_runs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_shift_runs_updated BEFORE UPDATE ON public.shift_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_shift_runs_line_status ON public.shift_runs(line_id, status);
CREATE INDEX idx_shift_runs_started     ON public.shift_runs(started_at DESC);
CREATE INDEX idx_shift_runs_work_order  ON public.shift_runs(work_order) WHERE work_order IS NOT NULL;

CREATE TABLE public.hourly_outputs (
  id                      UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_run_id            UUID  NOT NULL REFERENCES public.shift_runs(id) ON DELETE CASCADE,
  hour_index              INT   NOT NULL,
  hour_label              TEXT  NOT NULL,
  actual_qty              INT   NOT NULL DEFAULT 0,
  ng_qty                  INT   NOT NULL DEFAULT 0,
  downtime_minutes        INT   NOT NULL DEFAULT 0,
  is_break                BOOLEAN NOT NULL DEFAULT false,
  note                    TEXT,
  recorded_by_operator_id UUID  REFERENCES public.operators(id),
  recorded_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shift_run_id, hour_index)
);
ALTER TABLE public.hourly_outputs ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.ng_disposition AS ENUM ('rework', 'scrap', 'hold', 'accepted');

CREATE TABLE public.ng_entries (
  id                   UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_run_id         UUID                  NOT NULL REFERENCES public.shift_runs(id) ON DELETE CASCADE,
  defect_type_id       UUID                  REFERENCES public.defect_types(id),
  process_id           UUID                  REFERENCES public.processes(id) ON DELETE SET NULL,
  sub_process_id       UUID                  REFERENCES public.sub_processes(id),
  qty                  INT                   NOT NULL DEFAULT 1,
  disposition          public.ng_disposition NOT NULL DEFAULT 'rework',
  found_at             TIMESTAMPTZ           NOT NULL DEFAULT now(),
  found_by_operator_id UUID                  REFERENCES public.operators(id),
  description          TEXT,
  created_at           TIMESTAMPTZ           NOT NULL DEFAULT now()
);
ALTER TABLE public.ng_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ng_run             ON public.ng_entries(shift_run_id);
CREATE INDEX idx_ng_entries_process ON public.ng_entries(process_id);

CREATE TYPE public.dt_kind AS ENUM ('planned', 'unplanned');

CREATE TABLE public.downtime_entries (
  id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_run_id            UUID           NOT NULL REFERENCES public.shift_runs(id) ON DELETE CASCADE,
  category_id             UUID           REFERENCES public.downtime_categories(id),
  kind                    public.dt_kind NOT NULL DEFAULT 'unplanned',
  duration_minutes        INT            NOT NULL,
  started_at              TIMESTAMPTZ    NOT NULL DEFAULT now(),
  ended_at                TIMESTAMPTZ,
  root_cause              TEXT,
  action_taken            TEXT,
  recorded_by_operator_id UUID           REFERENCES public.operators(id),
  created_at              TIMESTAMPTZ    NOT NULL DEFAULT now()
);
ALTER TABLE public.downtime_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_dt_run ON public.downtime_entries(shift_run_id);

CREATE TABLE public.check_sheet_results (
  id                      UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_run_id            UUID  NOT NULL REFERENCES public.shift_runs(id) ON DELETE CASCADE,
  template_id             UUID  NOT NULL REFERENCES public.check_sheet_templates(id),
  passed                  BOOLEAN NOT NULL,
  checked_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_by_operator_id  UUID  REFERENCES public.operators(id),
  note                    TEXT,
  UNIQUE (shift_run_id, template_id)
);
ALTER TABLE public.check_sheet_results ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.eosr_reports (
  id                 UUID UNIQUE NOT NULL REFERENCES public.shift_runs(id) ON DELETE CASCADE,
  total_actual       INT  NOT NULL DEFAULT 0,
  total_ng           INT  NOT NULL DEFAULT 0,
  total_downtime_min INT  NOT NULL DEFAULT 0,
  achievement_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  oee_pct            NUMERIC(5,2),
  notes              TEXT,
  signed_by_name     TEXT,
  signed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by         UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);
ALTER TABLE public.eosr_reports ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Operator skill matrix
-- ---------------------------------------------------------------------------
CREATE TABLE public.operator_skills (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id          UUID    NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  skill_id             UUID    NOT NULL REFERENCES public.skills(id)    ON DELETE CASCADE,
  level                INT     NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 4),
  wi_pass              BOOLEAN NOT NULL DEFAULT false,
  last_training_date   DATE,
  next_training_date   DATE,
  last_evaluation_date DATE,
  next_evaluation_date DATE,
  trainer_notes        TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (operator_id, skill_id)
);
ALTER TABLE public.operator_skills ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policies: production lookup + operator skills
-- ---------------------------------------------------------------------------
DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['defect_types','downtime_categories','check_sheet_templates','operator_skills']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t||'_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(),''super_admin'')) WITH CHECK (public.has_role(auth.uid(),''super_admin''))', t||'_admin', t);
  END LOOP;
END $$;

-- Policies: shift_runs
CREATE POLICY shift_runs_read   ON public.shift_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY shift_runs_insert ON public.shift_runs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY shift_runs_update ON public.shift_runs FOR UPDATE TO authenticated
  USING      (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'leader'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY shift_runs_delete ON public.shift_runs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Helper: cek apakah shift run masih aktif
CREATE OR REPLACE FUNCTION public.run_is_active(_run_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shift_runs WHERE id = _run_id AND status IN ('setup', 'running'))
$$;
REVOKE EXECUTE ON FUNCTION public.run_is_active(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.run_is_active(UUID) TO authenticated;

-- Policies: entry tables
CREATE POLICY hourly_read  ON public.hourly_outputs FOR SELECT TO authenticated USING (true);
CREATE POLICY hourly_write ON public.hourly_outputs FOR ALL    TO authenticated
  USING      (public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'leader') AND public.run_is_active(shift_run_id)))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'leader') AND public.run_is_active(shift_run_id)));

CREATE POLICY ng_read  ON public.ng_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY ng_write ON public.ng_entries FOR ALL    TO authenticated
  USING      (public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'leader') AND public.run_is_active(shift_run_id)))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'leader') AND public.run_is_active(shift_run_id)));

CREATE POLICY dt_read  ON public.downtime_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY dt_write ON public.downtime_entries FOR ALL    TO authenticated
  USING      (public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'leader') AND public.run_is_active(shift_run_id)))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'leader') AND public.run_is_active(shift_run_id)));

CREATE POLICY cs_read  ON public.check_sheet_results FOR SELECT TO authenticated USING (true);
CREATE POLICY cs_write ON public.check_sheet_results FOR ALL    TO authenticated
  USING      (public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'leader') AND public.run_is_active(shift_run_id)))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'leader') AND public.run_is_active(shift_run_id)));

CREATE POLICY eosr_read  ON public.eosr_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY eosr_write ON public.eosr_reports FOR ALL    TO authenticated
  USING      (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'leader'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'leader'));


-- ---------------------------------------------------------------------------
-- SECTION · autonomous_check_items (item check per Line — dinamis)
-- ---------------------------------------------------------------------------
CREATE TABLE public.autonomous_check_items (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id     UUID    NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  code        TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  category    TEXT,
  frequency   TEXT    NOT NULL DEFAULT 'Setiap Shift',
  standard    TEXT,
  method      TEXT,
  sort_order  INT     NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (line_id, code)
);
ALTER TABLE public.autonomous_check_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autonomous_check_items_read"
  ON public.autonomous_check_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "autonomous_check_items_admin"
  ON public.autonomous_check_items FOR ALL TO authenticated
  USING      (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE INDEX IF NOT EXISTS idx_autonomous_check_items_line
  ON public.autonomous_check_items (line_id, sort_order);

-- ---------------------------------------------------------------------------
-- SECTION · Reference / Lookup Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.ref_product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, sort_order INT NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (name)
);
ALTER TABLE public.ref_product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_product_categories_read"  ON public.ref_product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_product_categories_admin" ON public.ref_product_categories FOR ALL    TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.ref_ng_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, sort_order INT NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (name)
);
ALTER TABLE public.ref_ng_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_ng_classes_read"  ON public.ref_ng_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_ng_classes_admin" ON public.ref_ng_classes FOR ALL    TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.ref_downtime_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, sort_order INT NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (name)
);
ALTER TABLE public.ref_downtime_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_downtime_classes_read"  ON public.ref_downtime_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_downtime_classes_admin" ON public.ref_downtime_classes FOR ALL    TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.ref_autonomous_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, sort_order INT NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (name)
);
ALTER TABLE public.ref_autonomous_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_autonomous_categories_read"  ON public.ref_autonomous_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_autonomous_categories_admin" ON public.ref_autonomous_categories FOR ALL    TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.ref_autonomous_frequencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, sort_order INT NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (name)
);
ALTER TABLE public.ref_autonomous_frequencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_autonomous_frequencies_read"  ON public.ref_autonomous_frequencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_autonomous_frequencies_admin" ON public.ref_autonomous_frequencies FOR ALL    TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hourly_outputs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ng_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.downtime_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_sheet_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.eosr_reports;

-- ---------------------------------------------------------------------------
-- SEED: defect types (NG)
-- ---------------------------------------------------------------------------
INSERT INTO public.defect_types (code, name, category, product_id, sort_order, active) VALUES
  ('NG-001', 'Scratch Surface',             'Visual',      NULL, 10,  true),
  ('NG-002', 'Label Paste Off / Lepas',     'Visual',      NULL, 20,  true),
  ('NG-003', 'Color Defect / Pudar',        'Visual',      NULL, 30,  true),
  ('NG-004', 'Missing Marking / Kode',      'Visual',      NULL, 40,  true),
  ('NG-005', 'Contamination / Kotoran',     'Visual',      NULL, 50,  true),
  ('NG-006', 'Conformal Coat Missing',      'Visual',      NULL, 60,  true),
  ('NG-007', 'Conformal Coat Blobbing',     'Visual',      NULL, 70,  true),
  ('NG-008', 'Dimension Out-of-Tolerance',  'Dimensional', NULL, 110, true),
  ('NG-009', 'Warpage / Deformasi',         'Dimensional', NULL, 120, true),
  ('NG-010', 'Wrong Position / Misalign',   'Dimensional', NULL, 130, true),
  ('NG-011', 'Gap / Clearance OOT',         'Dimensional', NULL, 140, true),
  ('NG-012', 'BT Burning Beta Fail',        'Functional',  NULL, 210, true),
  ('NG-013', 'BT Official Fail',            'Functional',  NULL, 220, true),
  ('NG-014', 'Final FI Fail',               'Functional',  NULL, 230, true),
  ('NG-015', 'Short Circuit',               'Functional',  NULL, 240, true),
  ('NG-016', 'Open Circuit',                'Functional',  NULL, 250, true),
  ('NG-017', 'Solder Bridge',               'Functional',  NULL, 260, true),
  ('NG-018', 'Missing Component',           'Functional',  NULL, 270, true),
  ('NG-019', 'Wrong Component',             'Functional',  NULL, 280, true),
  ('NG-020', 'Other / Lainnya',             'Others',      NULL, 990, true)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- SEED: downtime categories
-- ---------------------------------------------------------------------------
INSERT INTO public.downtime_categories (code, name, category, description, is_planned, sort_order, active) VALUES
  ('DT-001', 'Operator Absen / Kurang',        'Man',         'Jumlah operator tidak sesuai plan; perlu pengganti atau penyesuaian lini.',           false, 10,  true),
  ('DT-002', 'Operator Training / OJT',        'Man',         'Waktu henti untuk pelatihan, OJT, atau sertifikasi operator di lini.',                true,  20,  true),
  ('DT-003', 'Istirahat / Toilet Break',       'Man',         'Break personal operator di luar jadwal istirahat resmi.',                             true,  30,  true),
  ('DT-004', 'Machine Breakdown',              'Machine',     'Kerusakan mesin mendadak yang menyebabkan lini berhenti. Panggil maintenance.',        false, 110, true),
  ('DT-005', 'Fixture / Jig / Tool Rusak',     'Machine',     'Fixture, jig, atau perkakas rusak/aus sehingga proses tidak dapat berjalan.',         false, 120, true),
  ('DT-006', 'Preventive Maintenance (PM)',    'Machine',     'Perawatan berkala terjadwal — lini berhenti sesuai jadwal PM.',                       true,  130, true),
  ('DT-007', 'Setup / Adjustment Mesin',       'Machine',     'Penyetelan parameter mesin (suhu, tekanan, kecepatan) di luar changeover produk.',     true,  140, true),
  ('DT-008', 'Kalibrasi Alat / Gauge',         'Machine',     'Kalibrasi atau verifikasi alat ukur, gauge, atau sensor.',                            true,  150, true),
  ('DT-009', 'Changeover / Ganti Produk',      'Method',      'Setup pergantian produk: ganti jig, program, parameter, dan verifikasi 1st article.',  true,  210, true),
  ('DT-010', 'Quality Hold / Stop & Check',    'Method',      'Lini dihentikan untuk inspeksi kualitas massal akibat temuan NG di lini.',             false, 220, true),
  ('DT-011', 'Engineering Change (ECN)',        'Method',      'Perubahan desain atau proses dari Engineering — lini stop selama implementasi.',       false, 230, true),
  ('DT-012', 'Tunggu Instruksi / WO',          'Method',      'Operator menunggu instruksi kerja, Work Order, atau konfirmasi dari PPIC/Leader.',     false, 240, true),
  ('DT-013', 'Tunggu Material / Part',         'Material',    'Material atau komponen belum tiba di lini; menunggu pengiriman dari warehouse.',        false, 310, true),
  ('DT-014', 'Material Defect / Reject',       'Material',    'Material incoming rejected oleh QC; proses berhenti menunggu material pengganti.',     false, 320, true),
  ('DT-015', 'Salah Material / Wrong Part',    'Material',    'Material atau part yang diterima tidak sesuai spesifikasi atau part number.',          false, 330, true),
  ('DT-016', 'Stok Material Habis',            'Material',    'Buffer stok material di lini habis sebelum resupply tiba.',                            false, 340, true),
  ('DT-017', 'Pemadaman Listrik (PLN/Genset)', 'Environment', 'Gangguan pasokan listrik dari PLN atau kegagalan genset backup.',                     false, 410, true),
  ('DT-018', 'Gangguan Udara / Kompresor',     'Environment', 'Tekanan angin kompresor turun atau compressor breakdown.',                             false, 420, true),
  ('DT-019', 'Suhu Ruangan Ekstrem',           'Environment', 'Suhu lingkungan di luar batas toleransi produksi (terlalu panas/dingin).',             false, 430, true),
  ('DT-020', 'Gangguan Fasilitas Lainnya',     'Environment', 'Masalah fasilitas lain: kebocoran atap, kebakaran kecil, evakuasi, dll.',              false, 440, true)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- SEED: check sheet templates
-- ---------------------------------------------------------------------------
INSERT INTO public.check_sheet_templates (kind, code, label, sort_order) VALUES
  ('5F5L',       '5F',  '5 First - Awal Shift Inspection', 10),
  ('5F5L',       '5L',  '5 Last - Akhir Shift Inspection',  20),
  ('AUTONOMOUS', 'AM1', 'Mesin First Function',             10),
  ('AUTONOMOUS', 'AM2', 'Label Printer',                    20),
  ('AUTONOMOUS', 'AM3', 'Mesin Auto Potting',               30),
  ('AUTONOMOUS', 'AM1', 'Mesin First Function',             10),
  ('AUTONOMOUS', 'AM2', 'Label Printer',                    20),
  ('AUTONOMOUS', 'AM3', 'Mesin Auto Potting',               30),
  ('AUTONOMOUS', 'AM4', 'Mixing PU',                        40),
  ('AUTONOMOUS', 'AM5', 'Mesin Final Inspection',           50)
ON CONFLICT (kind, code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- SEED: reference lookup tables (ref_*)
-- ---------------------------------------------------------------------------
INSERT INTO public.ref_product_categories (name, sort_order, active) VALUES
  ('CCU', 10, true), ('Fuel Sender', 20, true), ('Speedometer Digital', 30, true),
  ('Speedometer Mechanical', 40, true), ('Winker Lamp', 50, true), ('ECU', 60, true),
  ('CDI', 70, true), ('Regulator', 80, true), ('Sensor', 90, true), ('Others', 100, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.ref_ng_classes (name, sort_order, active) VALUES
  ('Visual', 10, true), ('Dimensional', 20, true), ('Functional', 30, true),
  ('Assembly', 40, true), ('Electrical', 50, true), ('Others', 60, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.ref_downtime_classes (name, sort_order, active) VALUES
  ('Man', 10, true), ('Machine', 20, true), ('Method', 30, true),
  ('Material', 40, true), ('Environment', 50, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.ref_autonomous_categories (name, sort_order, active) VALUES
  ('Kebersihan', 10, true), ('Pelumasan', 20, true), ('Inspeksi', 30, true),
  ('Pengencangan', 40, true), ('K3', 50, true), ('Pengecekan Visual', 60, true),
  ('Pengecekan Fungsi', 70, true), ('Pengukuran', 80, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.ref_autonomous_frequencies (name, sort_order, active) VALUES
  ('Setiap Shift', 10, true), ('Harian', 20, true),
  ('Mingguan', 30, true), ('Bulanan', 40, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Storage: operator photos bucket
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'operator-photos',
  'operator-photos',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "op_photos_read"   ON storage.objects;
DROP POLICY IF EXISTS "op_photos_upload" ON storage.objects;
DROP POLICY IF EXISTS "op_photos_delete" ON storage.objects;

CREATE POLICY "op_photos_read"   ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'operator-photos');
CREATE POLICY "op_photos_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'operator-photos');
CREATE POLICY "op_photos_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'operator-photos');

-- =============================================================================
-- DONE
-- =============================================================================
-- Schema version: all migrations up to 20260501 (username_login)
-- Key changes vs previous version:
--   • operators: removed pin_hash, user_id (shop-floor only; no auth link)
--   • group_leaders: operator_id → user_id (references profiles.user_id)
--   • shift_runs: leader_operator_id → leader_user_id (references auth.users.id)
--   • removed hash_operator_pin / verify_operator_pin RPC functions
--   • profiles: tambah kolom username + idx_profiles_username_lower
--   • RPC get_email_by_username callable by anon (untuk staff login)
-- Includes: operators_public VIEW, operator_line/process_assignments,
--           operator_skills (extended), skills, process_skill_requirements,
--           storage bucket operator-photos,
--           20 NG categories (NG-001..NG-020), 20 DT categories (DT-001..DT-020),
--           autonomous_check_items, 5 ref_* lookup tables + seed data
-- =============================================================================
