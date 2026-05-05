
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

-- PROCESSES
CREATE TABLE public.processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sub_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (process_id, code)
);
ALTER TABLE public.sub_processes ENABLE ROW LEVEL SECURITY;

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
  target_qty INT NOT NULL,
  hourly_target INT,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (line_id, product_id, shift_id, effective_from)
);
ALTER TABLE public.production_targets ENABLE ROW LEVEL SECURITY;

-- Common policy helper: read for any authenticated, write for super_admin
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['lines','products','processes','sub_processes','shifts','production_targets']
  LOOP
    EXECUTE format('CREATE POLICY "%I_read" ON public.%I FOR SELECT TO authenticated USING (true)', t||'_read', t);
    EXECUTE format('CREATE POLICY "%I_admin" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''super_admin'')) WITH CHECK (public.has_role(auth.uid(), ''super_admin''))', t||'_admin', t);
  END LOOP;
END $$;

-- ============ SEED ============
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

-- Default targets for LINE-A × MCU-001
INSERT INTO public.production_targets (line_id, product_id, shift_id, target_qty, hourly_target)
SELECT l.id, p.id, s.id, 1200, 150
FROM public.lines l, public.products p, public.shifts s
WHERE l.code='LINE-A' AND p.code='MCU-001' AND s.code='S1'
ON CONFLICT DO NOTHING;

-- Sample operators with bcrypt-hashed PINs (pgcrypto blowfish — same format the verify-pin function expects)
-- Default PINs (rotate via Admin):
--   1234 → all sample operators below
INSERT INTO public.operators (full_name, employee_code, role, pin_hash, initials, avatar_color, assigned_line_ids)
SELECT v.full_name, v.employee_code, v.role::public.app_role,
       crypt('1234', gen_salt('bf', 10)),
       v.initials, v.avatar_color,
       ARRAY(SELECT id FROM public.lines WHERE code = ANY(v.lines))::uuid[]
FROM (VALUES
  ('Budi Santoso',     'EMP-001', 'leader',   'BS', '#1A6EFA', ARRAY['LINE-A']),
  ('Siti Rahayu',      'EMP-002', 'leader',   'SR', '#00B37D', ARRAY['LINE-B']),
  ('Andi Pratama',     'EMP-003', 'operator', 'AP', '#F59E0B', ARRAY['LINE-A']),
  ('Dewi Lestari',     'EMP-004', 'operator', 'DL', '#8B5CF6', ARRAY['LINE-A']),
  ('Rudi Hartono',     'EMP-005', 'operator', 'RH', '#EF4444', ARRAY['LINE-A','LINE-B']),
  ('Maya Putri',       'EMP-006', 'operator', 'MP', '#0EA5E9', ARRAY['LINE-B']),
  ('Pak Hendro',       'EMP-007', 'viewer',   'PH', '#6B7280', ARRAY[]::text[])
) AS v(full_name, employee_code, role, initials, avatar_color, lines)
ON CONFLICT (employee_code) DO NOTHING;
