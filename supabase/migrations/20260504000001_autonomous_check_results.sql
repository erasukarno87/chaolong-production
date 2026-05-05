-- =============================================================================
-- Migration: autonomous_check_results
-- Menyimpan hasil check item Autonomous Maintenance per shift run
-- Menggantikan penyimpanan local state yang tidak persistent
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tabel hasil check item
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.autonomous_check_results (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_run_id          UUID        NOT NULL REFERENCES public.shift_runs(id) ON DELETE CASCADE,
  check_item_id         UUID        NOT NULL REFERENCES public.autonomous_check_items(id) ON DELETE CASCADE,
  
  -- Status check: pass, fail, na (not applicable)
  status                TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'in_progress', 'pass', 'fail', 'na')),
  
  -- Untuk item bertipe measurement
  measured_value        NUMERIC(18,4),
  
  -- Catatan operator saat check
  note                  TEXT,
  
  -- Bukti foto (photo evidence)
  photo_urls            TEXT[],
  
  -- Waktu check
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  
  -- Siapa yang check
  checked_by_operator_id UUID      REFERENCES public.operators(id),
  created_by            UUID      REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: 1 operator hanya bisa check 1 item sekali per shift run
  UNIQUE (shift_run_id, check_item_id, checked_by_operator_id)
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_autonomous_results_shift_run
  ON public.autonomous_check_results (shift_run_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_results_check_item
  ON public.autonomous_check_results (check_item_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_results_operator
  ON public.autonomous_check_results (checked_by_operator_id);

-- ---------------------------------------------------------------------------
-- 2. Tabel summary compliance per shift run
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.autonomous_check_summary (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_run_id          UUID        NOT NULL REFERENCES public.shift_runs(id) ON DELETE CASCADE,
  check_template_code   TEXT,                           -- AM1, AM2, AM3, dst
  check_session         TEXT        NOT NULL DEFAULT 'first'  -- 'first' | 'last'
                                  CHECK (check_session IN ('first', 'last')),
  
  -- Compliance score
  total_items           INT         NOT NULL DEFAULT 0,
  passed_items          INT         NOT NULL DEFAULT 0,
  failed_items          INT         NOT NULL DEFAULT 0,
  na_items              INT         NOT NULL DEFAULT 0,
  
  -- Persentase kepatuhan
  compliance_rate       NUMERIC(5,2) NOT NULL DEFAULT 0,
  
  -- Critical items
  critical_total         INT         NOT NULL DEFAULT 0,
  critical_failed       INT         NOT NULL DEFAULT 0,
  
  -- Waktu check
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  
  -- Status keseluruhan
  overall_passed        BOOLEAN     NOT NULL DEFAULT false,
  
  -- Siapa yang summary
  created_by_operator_id UUID       REFERENCES public.operators(id),
  created_by_user_id     UUID       REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT 0,
  
  UNIQUE (shift_run_id, check_session)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_autonomous_summary_shift_run
  ON public.autonomous_check_summary (shift_run_id);

-- ---------------------------------------------------------------------------
-- 3. Update trigger untuk updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS tg_autonomous_results_updated ON public.autonomous_check_results;
CREATE TRIGGER tg_autonomous_results_updated 
  BEFORE UPDATE ON public.autonomous_check_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tg_autonomous_summary_updated ON public.autonomous_check_summary;
CREATE TRIGGER tg_autonomous_summary_updated 
  BEFORE UPDATE ON public.autonomous_check_summary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 4. RLS Policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.autonomous_check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_check_summary  ENABLE ROW LEVEL SECURITY;

-- Results: semua authenticated bisa read, leader/operator bisa write
CREATE POLICY "autonomous_results_read" ON public.autonomous_check_results
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "autonomous_results_write" ON public.autonomous_check_results
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') 
         OR public.has_role(auth.uid(), 'leader')
         OR public.has_role(auth.uid(), 'operator'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') 
              OR public.has_role(auth.uid(), 'leader')
              OR public.has_role(auth.uid(), 'operator'));

-- Summary: read all, write leader/admin
CREATE POLICY "autonomous_summary_read" ON public.autonomous_check_summary
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "autonomous_summary_write" ON public.autonomous_check_summary
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') 
         OR public.has_role(auth.uid(), 'leader'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') 
              OR public.has_role(auth.uid(), 'leader'));

-- ---------------------------------------------------------------------------
-- 5. Function untuk calculate compliance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_autonomous_compliance(
  p_shift_run_id UUID,
  p_check_session TEXT DEFAULT 'first'
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result JSON;
  v_total INT;
  v_passed INT;
  v_failed INT;
  v_na INT;
  v_critical_total INT;
  v_critical_failed INT;
BEGIN
  -- Count items
  SELECT 
    COUNT(*) INTO v_total
  FROM public.autonomous_check_results r
  JOIN public.autonomous_check_items i ON i.id = r.check_item_id
  WHERE r.shift_run_id = p_shift_run_id;
  
  SELECT COUNT(*) INTO v_passed
  FROM public.autonomous_check_results
  WHERE shift_run_id = p_shift_run_id AND status = 'pass';
  
  SELECT COUNT(*) INTO v_failed
  FROM public.autonomous_check_results
  WHERE shift_run_id = p_shift_run_id AND status = 'fail';
  
  SELECT COUNT(*) INTO v_na
  FROM public.autonomous_check_results
  WHERE shift_run_id = p_shift_run_id AND status = 'na';
  
  -- Critical items
  SELECT COUNT(*) INTO v_critical_total
  FROM public.autonomous_check_results r
  JOIN public.autonomous_check_items i ON i.id = r.check_item_id
  WHERE r.shift_run_id = p_shift_run_id 
    AND (i.is_critical = true OR i.category = 'K3');
  
  SELECT COUNT(*) INTO v_critical_failed
  FROM public.autonomous_check_results r
  JOIN public.autonomous_check_items i ON i.id = r.check_item_id
  WHERE r.shift_run_id = p_shift_run_id 
    AND r.status = 'fail'
    AND (i.is_critical = true OR i.category = 'K3');
  
  v_result := json_build_object(
    'total', v_total,
    'passed', v_passed,
    'failed', v_failed,
    'na', v_na,
    'critical_total', v_critical_total,
    'critical_failed', v_critical_failed,
    'compliance_rate', CASE WHEN v_total > 0 
      THEN ROUND((v_passed::NUMERIC / (v_total - v_na) * 100)::NUMERIC, 2)
      ELSE 0 END,
    'overall_passed', v_failed = 0 AND v_critical_failed = 0 AND v_total > 0
  );
  
  RETURN v_result;
END; $$;

GRANT EXECUTE ON FUNCTION public.calculate_autonomous_compliance(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Realtime enabled
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.autonomous_check_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.autonomous_check_summary;

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
COMMIT;