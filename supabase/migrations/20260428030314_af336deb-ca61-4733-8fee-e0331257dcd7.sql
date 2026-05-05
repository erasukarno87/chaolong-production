
-- ====== MASTER LOOKUPS ======
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

-- ====== SHIFT RUNS ======
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

-- ====== HOURLY OUTPUTS ======
CREATE TABLE public.hourly_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_run_id UUID NOT NULL REFERENCES public.shift_runs(id) ON DELETE CASCADE,
  hour_index INT NOT NULL,                    -- 0..n
  hour_label TEXT NOT NULL,                   -- '07:00–08:00'
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

-- ====== NG ENTRIES ======
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

-- ====== DOWNTIME ENTRIES ======
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

-- ====== CHECK SHEET RESULTS ======
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

-- ====== EOSR ======
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

-- ====== OPERATOR SKILLS ======
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

-- ====== POLICIES ======
-- master lookups: read for auth, admin write
DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['defect_types','downtime_categories','check_sheet_templates','operator_skills']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t||'_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(),''super_admin'')) WITH CHECK (public.has_role(auth.uid(),''super_admin''))', t||'_admin', t);
  END LOOP;
END $$;

-- shift_runs
CREATE POLICY shift_runs_read ON public.shift_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY shift_runs_insert ON public.shift_runs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'leader'));
CREATE POLICY shift_runs_update ON public.shift_runs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'leader'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'leader'));
CREATE POLICY shift_runs_delete ON public.shift_runs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

-- helper: row is on an active run
CREATE OR REPLACE FUNCTION public.run_is_active(_run_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shift_runs WHERE id=_run_id AND status IN ('setup','running'))
$$;
REVOKE EXECUTE ON FUNCTION public.run_is_active(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_is_active(UUID) TO authenticated;

-- entries: anyone authenticated may read; insert/update if leader/operator/admin AND run active; admin always
CREATE POLICY hourly_read ON public.hourly_outputs FOR SELECT TO authenticated USING (true);
CREATE POLICY hourly_write ON public.hourly_outputs FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR ((public.has_role(auth.uid(),'leader') OR public.has_role(auth.uid(),'operator')) AND public.run_is_active(shift_run_id))
  )
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR ((public.has_role(auth.uid(),'leader') OR public.has_role(auth.uid(),'operator')) AND public.run_is_active(shift_run_id))
  );

CREATE POLICY ng_read ON public.ng_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY ng_write ON public.ng_entries FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR ((public.has_role(auth.uid(),'leader') OR public.has_role(auth.uid(),'operator')) AND public.run_is_active(shift_run_id))
  )
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR ((public.has_role(auth.uid(),'leader') OR public.has_role(auth.uid(),'operator')) AND public.run_is_active(shift_run_id))
  );

CREATE POLICY dt_read ON public.downtime_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY dt_write ON public.downtime_entries FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR ((public.has_role(auth.uid(),'leader') OR public.has_role(auth.uid(),'operator')) AND public.run_is_active(shift_run_id))
  )
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR ((public.has_role(auth.uid(),'leader') OR public.has_role(auth.uid(),'operator')) AND public.run_is_active(shift_run_id))
  );

CREATE POLICY cs_read ON public.check_sheet_results FOR SELECT TO authenticated USING (true);
CREATE POLICY cs_write ON public.check_sheet_results FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR ((public.has_role(auth.uid(),'leader') OR public.has_role(auth.uid(),'operator')) AND public.run_is_active(shift_run_id))
  )
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR ((public.has_role(auth.uid(),'leader') OR public.has_role(auth.uid(),'operator')) AND public.run_is_active(shift_run_id))
  );

-- EOSR: leader/admin only
CREATE POLICY eosr_read ON public.eosr_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY eosr_write ON public.eosr_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'leader'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'leader'));

-- ====== REALTIME ======
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hourly_outputs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ng_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.downtime_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_sheet_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.eosr_reports;

-- ====== SEED MASTER LOOKUPS ======
INSERT INTO public.defect_types (code, name, category, sort_order) VALUES
  ('SHORT',     'MCU Short Circuit',         'Electrical', 10),
  ('SOLDBR',    'Solder Bridge',             'Solder',     20),
  ('SCRATCH',   'Visual Scratch',            'Visual',     30),
  ('LBLOFF',    'Label Paste Off',           'Visual',     40),
  ('COATMISS',  'Conformal Coat Missing',    'Coating',    50),
  ('BTFAIL',    'BT Fail',                   'Test',       60),
  ('FIFAIL',    'Final FI Fail',             'Test',       70),
  ('DIMOOT',    'Dimension OOT',             'Mechanical', 80),
  ('MISSCOMP',  'Missing Component',         'Assembly',   90),
  ('OTHER',     'Other',                     'Other',      99)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.downtime_categories (code, name, is_planned, sort_order) VALUES
  ('BREAKDOWN',  'Breakdown Mesin',         false, 10),
  ('WAITMAT',    'Tunggu Material',         false, 20),
  ('CHANGEOVER', 'Changeover/Setup',        true,  30),
  ('QHOLD',      'Quality Hold',            false, 40),
  ('UTIL',       'Utility (Listrik/Air)',   false, 50),
  ('OTHER_DT',   'Lainnya',                 false, 99)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.check_sheet_templates (kind, code, label, sort_order) VALUES
  ('5F5L',       '5F',  '5 First — Awal Shift Inspection', 10),
  ('5F5L',       '5L',  '5 Last — Akhir Shift Inspection', 20),
  ('AUTONOMOUS', 'AM1', 'Mesin First Function',            10),
  ('AUTONOMOUS', 'AM2', 'Label Printer',                   20),
  ('AUTONOMOUS', 'AM3', 'Mesin Auto Potting',              30),
  ('AUTONOMOUS', 'AM4', 'Mixing PU',                       40),
  ('AUTONOMOUS', 'AM5', 'Mesin Final Inspection',          50)
ON CONFLICT (kind, code) DO NOTHING;

-- Sub-processes for our seeded processes
INSERT INTO public.sub_processes (process_id, code, name, sort_order)
SELECT p.id, sp.code, sp.name, sp.sort_order FROM public.processes p
JOIN (VALUES
  ('BTBETA',   'BT-1', 'BT Burning Beta',     10),
  ('MCUFLASH', 'MF-1', 'MCU Flash',           10),
  ('FINALFI',  'FI-1', 'Final FI',            10),
  ('VISPACK',  'VP-1', 'Visual & Pack',       10),
  ('SOLDER',   'SD-1', 'Soldering',           10),
  ('CONFCOAT', 'CC-1', 'Conformal Coat',      10)
) AS sp(proc_code, code, name, sort_order) ON sp.proc_code = p.code
ON CONFLICT (process_id, code) DO NOTHING;

-- Skill matrix sample
INSERT INTO public.operator_skills (operator_id, process_id, level, wi_pass)
SELECT o.id, p.id,
       (((abs(hashtext(o.full_name||p.code)) % 5))::int),
       (abs(hashtext(o.full_name||p.code)) % 4) <> 0
FROM public.operators o
CROSS JOIN public.processes p
ON CONFLICT (operator_id, process_id) DO NOTHING;
