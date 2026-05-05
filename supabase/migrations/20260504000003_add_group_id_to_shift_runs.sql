-- =============================================================================
-- Migration: add_group_id_to_shift_runs
-- Menambahkan group_id untuk traceability shift run per grup
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Check apakah column sudah ada
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'shift_runs' 
    AND column_name = 'group_id'
  ) THEN
    -- Tambahkan group_id
    ALTER TABLE public.shift_runs 
      ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;
    
    -- Tambahkan index
    CREATE INDEX IF NOT EXISTS idx_shift_runs_group
      ON public.shift_runs (group_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Tambah leader_operator_id ( referensi ke operators untuk tracking leader )
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'shift_runs' 
    AND column_name = 'leader_operator_id'
  ) THEN
    ALTER TABLE public.shift_runs 
      ADD COLUMN leader_operator_id UUID REFERENCES public.operators(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_shift_runs_leader
      ON public.shift_runs (leader_operator_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Update function run_is_active untuk include group check
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_is_active(p_run_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.shift_runs 
    WHERE id = p_run_id 
      AND status IN ('setup', 'running')
  );
END; $$;

-- ---------------------------------------------------------------------------
-- 4. View untuk shift run dengan detail
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS public.mv_shift_run_details CASCADE;
CREATE MATERIALIZED VIEW public.mv_shift_run_details AS
SELECT 
  sr.id,
  sr.line_id,
  l.name AS line_name,
  l.code AS line_code,
  sr.product_id,
  p.name AS product_name,
  p.code AS product_code,
  sr.shift_id,
  sh.name AS shift_name,
  sr.group_id,
  g.name AS group_name,
  sr.leader_operator_id,
  op.full_name AS leader_name,
  sr.work_order,
  sr.target_qty,
  sr.hourly_target,
  sr.status,
  sr.started_at,
  sr.ended_at,
  sr.created_at
FROM public.shift_runs sr
LEFT JOIN public.lines l ON l.id = sr.line_id
LEFT JOIN public.products p ON p.id = sr.product_id
LEFT JOIN public.shifts sh ON sh.id = sr.shift_id
LEFT JOIN public.groups g ON g.id = sr.group_id
LEFT JOIN public.operators op ON op.id = sr.leader_operator_id
WITH NO DATA;

CREATE UNIQUE INDEX idx_mv_shift_run_details_id ON public.mv_shift_run_details (id);

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
COMMIT;