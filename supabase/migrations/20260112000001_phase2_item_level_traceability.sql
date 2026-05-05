-- =============================================================================
-- PHASE 2: Item-Level Traceability
-- Manufacturing Excellence Schema Architecture
-- 
-- Goal: Enable item-level inspection tracking for full traceability
-- Downtime: 0 minutes (backward compatible, additive only)
-- Risk: MEDIUM
-- 
-- Changes:
--   1. Create check_sheet_sessions (group results into sessions)
--   2. Create fivef5l_check_results (item-level 5F5L results)
--   3. Enhance autonomous_check_results (already exists)
--   4. Create measurement_records (detailed measurement data)
--   5. Add measurement fields to ng_entries
--   6. Add workstation_id to transaction tables
-- 
-- Backward Compatibility: 100%
--   - Old check_sheet_results table remains functional
--   - New tables are optional to use
--   - Dual-read pattern: app reads from both old and new
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: Check Sheet Sessions (Grouping Mechanism)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1.1 Create check_sheet_sessions table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.check_sheet_sessions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_run_id          UUID        NOT NULL REFERENCES public.shift_runs(id) ON DELETE CASCADE,
  
  -- Session type: '5F' (5 First), '5L' (5 Last), 'AUTO' (Autonomous)
  session_type          TEXT        NOT NULL CHECK (session_type IN ('5F', '5L', 'AUTO')),
  
  -- For autonomous: which template (AM1, AM2, etc.)
  template_code         TEXT,
  
  -- Session metadata
  line_id               UUID        NOT NULL REFERENCES public.lines(id),
  workstation_id        UUID        REFERENCES public.workstations(id) ON DELETE SET NULL,
  
  -- Session status
  status                TEXT        NOT NULL DEFAULT 'in_progress'
                                    CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  
  -- Timing
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at          TIMESTAMPTZ,
  
  -- Summary statistics (calculated from item results)
  total_items           INTEGER     NOT NULL DEFAULT 0,
  items_passed          INTEGER     NOT NULL DEFAULT 0,
  items_failed          INTEGER     NOT NULL DEFAULT 0,
  items_na              INTEGER     NOT NULL DEFAULT 0,
  
  -- Overall pass/fail
  overall_passed        BOOLEAN     NOT NULL DEFAULT false,
  
  -- Operator who performed the check
  checked_by_operator_id UUID       REFERENCES public.operators(id),
  
  -- Audit
  created_by            UUID        REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one session per type per shift run
  UNIQUE (shift_run_id, session_type, template_code)
);

CREATE INDEX idx_sessions_shift_run ON public.check_sheet_sessions (shift_run_id);
CREATE INDEX idx_sessions_line ON public.check_sheet_sessions (line_id);
CREATE INDEX idx_sessions_workstation ON public.check_sheet_sessions (workstation_id);
CREATE INDEX idx_sessions_status ON public.check_sheet_sessions (status);

ALTER TABLE public.check_sheet_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_read" ON public.check_sheet_sessions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sessions_write" ON public.check_sheet_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') 
         OR public.has_role(auth.uid(), 'leader')
         OR public.has_role(auth.uid(), 'operator'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') 
              OR public.has_role(auth.uid(), 'leader')
              OR public.has_role(auth.uid(), 'operator'));

CREATE TRIGGER tg_sessions_updated 
  BEFORE UPDATE ON public.check_sheet_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- SECTION 2: 5F5L Item-Level Results
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 2.1 Enhance fivef5l_check_items with measurement fields
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Add min/max/uom for measurement-type items
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'fivef5l_check_items' 
    AND column_name = 'min_value'
  ) THEN
    ALTER TABLE public.fivef5l_check_items
      ADD COLUMN min_value       NUMERIC(18,4),
      ADD COLUMN max_value       NUMERIC(18,4),
      ADD COLUMN uom             TEXT,
      ADD COLUMN is_critical     BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN tolerance_pct   NUMERIC(5,2);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2.2 Create fivef5l_check_results table (item-level results)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fivef5l_check_results (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID        NOT NULL REFERENCES public.check_sheet_sessions(id) ON DELETE CASCADE,
  item_id               UUID        NOT NULL REFERENCES public.fivef5l_check_items(id) ON DELETE CASCADE,
  
  -- Result status
  status                TEXT        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'pass', 'fail', 'na')),
  
  -- For measurement-type items (input_type = 'float')
  measured_value        NUMERIC(18,4),
  is_within_spec        BOOLEAN,
  
  -- For text-type items (input_type = 'text')
  text_value            TEXT,
  
  -- NG reason if failed
  ng_reason             TEXT,
  
  -- Photo evidence
  photo_urls            TEXT[],
  
  -- Operator note
  note                  TEXT,
  
  -- Timing
  checked_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Operator who checked this item
  checked_by_operator_id UUID       REFERENCES public.operators(id),
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (session_id, item_id)
);

CREATE INDEX idx_f5l_results_session ON public.fivef5l_check_results (session_id);
CREATE INDEX idx_f5l_results_item ON public.fivef5l_check_results (item_id);
CREATE INDEX idx_f5l_results_status ON public.fivef5l_check_results (status);

ALTER TABLE public.fivef5l_check_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "f5l_results_read" ON public.fivef5l_check_results
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "f5l_results_write" ON public.fivef5l_check_results
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') 
         OR public.has_role(auth.uid(), 'leader')
         OR public.has_role(auth.uid(), 'operator'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') 
              OR public.has_role(auth.uid(), 'leader')
              OR public.has_role(auth.uid(), 'operator'));

CREATE TRIGGER tg_f5l_results_updated 
  BEFORE UPDATE ON public.fivef5l_check_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- SECTION 3: Autonomous Check Enhancements
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 3.1 Enhance autonomous_check_items with measurement fields
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'autonomous_check_items' 
    AND column_name = 'min_value'
  ) THEN
    ALTER TABLE public.autonomous_check_items
      ADD COLUMN min_value       NUMERIC(18,4),
      ADD COLUMN max_value       NUMERIC(18,4),
      ADD COLUMN uom             TEXT,
      ADD COLUMN is_critical     BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN tolerance_pct   NUMERIC(5,2),
      ADD COLUMN instrument_id   TEXT;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3.2 Enhance autonomous_check_results (if not already done in previous migration)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'autonomous_check_results' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE public.autonomous_check_results
      ADD COLUMN session_id UUID REFERENCES public.check_sheet_sessions(id) ON DELETE CASCADE;
    
    CREATE INDEX idx_auto_results_session ON public.autonomous_check_results (session_id);
  END IF;
  
  -- Add is_within_spec if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'autonomous_check_results' 
    AND column_name = 'is_within_spec'
  ) THEN
    ALTER TABLE public.autonomous_check_results
      ADD COLUMN is_within_spec BOOLEAN;
  END IF;
END $$;

-- =============================================================================
-- SECTION 4: Measurement Records (Detailed Traceability)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 4.1 Create measurement_records table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.measurement_records (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to source (polymorphic)
  source_table          TEXT        NOT NULL CHECK (source_table IN ('fivef5l_check_results', 'autonomous_check_results', 'ng_entries', 'workstation_parameters')),
  source_id             UUID        NOT NULL,
  
  -- Measurement details
  parameter_code        TEXT        NOT NULL,
  parameter_name        TEXT        NOT NULL,
  measured_value        NUMERIC(18,4) NOT NULL,
  target_value          NUMERIC(18,4),
  min_value             NUMERIC(18,4),
  max_value             NUMERIC(18,4),
  uom                   TEXT        NOT NULL,
  
  -- Tolerance check
  is_within_spec        BOOLEAN     NOT NULL,
  deviation_pct         NUMERIC(8,4),
  
  -- Instrument tracking (ISO 9001 requirement)
  instrument_id         TEXT,
  instrument_calibrated_date DATE,
  instrument_due_date   DATE,
  
  -- Environmental conditions (if applicable)
  temperature_c         NUMERIC(5,2),
  humidity_pct          NUMERIC(5,2),
  
  -- Operator and timing
  measured_by_operator_id UUID      REFERENCES public.operators(id),
  measured_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_measurements_source ON public.measurement_records (source_table, source_id);
CREATE INDEX idx_measurements_parameter ON public.measurement_records (parameter_code);
CREATE INDEX idx_measurements_spec ON public.measurement_records (is_within_spec);
CREATE INDEX idx_measurements_date ON public.measurement_records (measured_at);

ALTER TABLE public.measurement_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "measurements_read" ON public.measurement_records
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "measurements_write" ON public.measurement_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') 
         OR public.has_role(auth.uid(), 'leader')
         OR public.has_role(auth.uid(), 'operator'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') 
              OR public.has_role(auth.uid(), 'leader')
              OR public.has_role(auth.uid(), 'operator'));

-- =============================================================================
-- SECTION 5: NG Entries Enhancement (Lot/Serial Tracking)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 5.1 Add measurement and traceability fields to ng_entries
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ng_entries' 
    AND column_name = 'measurement_value'
  ) THEN
    ALTER TABLE public.ng_entries
      ADD COLUMN measurement_value  NUMERIC(18,4),
      ADD COLUMN target_value       NUMERIC(18,4),
      ADD COLUMN is_within_spec     BOOLEAN,
      ADD COLUMN lot_number         TEXT,
      ADD COLUMN serial_number      TEXT,
      ADD COLUMN corrective_action  TEXT,
      ADD COLUMN root_cause_analysis TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ng_lot ON public.ng_entries (lot_number) WHERE lot_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ng_serial ON public.ng_entries (serial_number) WHERE serial_number IS NOT NULL;

-- =============================================================================
-- SECTION 6: Add workstation_id to Transaction Tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 6.1 Add workstation_id to hourly_outputs (if not exists from previous migration)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'hourly_outputs' 
    AND column_name = 'workstation_id'
  ) THEN
    ALTER TABLE public.hourly_outputs 
      ADD COLUMN workstation_id UUID REFERENCES public.workstations(id) ON DELETE SET NULL;
    CREATE INDEX idx_hourly_outputs_workstation 
      ON public.hourly_outputs (workstation_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6.2 Add workstation_id to ng_entries (if not exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ng_entries' 
    AND column_name = 'workstation_id'
  ) THEN
    ALTER TABLE public.ng_entries 
      ADD COLUMN workstation_id UUID REFERENCES public.workstations(id) ON DELETE SET NULL;
    CREATE INDEX idx_ng_entries_workstation 
      ON public.ng_entries (workstation_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6.3 Add workstation_id to downtime_entries (if not exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'downtime_entries' 
    AND column_name = 'workstation_id'
  ) THEN
    ALTER TABLE public.downtime_entries 
      ADD COLUMN workstation_id UUID REFERENCES public.workstations(id) ON DELETE SET NULL;
    CREATE INDEX idx_downtime_entries_workstation 
      ON public.downtime_entries (workstation_id);
  END IF;
END $$;

-- =============================================================================
-- SECTION 7: Helper Functions for Session Management
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 7.1 Function to calculate session summary
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_session_summary(p_session_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result JSON;
  v_session RECORD;
  v_total INT;
  v_passed INT;
  v_failed INT;
  v_na INT;
BEGIN
  -- Get session info
  SELECT * INTO v_session FROM public.check_sheet_sessions WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'session_not_found');
  END IF;
  
  -- Count results based on session type
  IF v_session.session_type IN ('5F', '5L') THEN
    -- 5F5L results
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'pass'),
      COUNT(*) FILTER (WHERE status = 'fail'),
      COUNT(*) FILTER (WHERE status = 'na')
    INTO v_total, v_passed, v_failed, v_na
    FROM public.fivef5l_check_results
    WHERE session_id = p_session_id;
  ELSE
    -- Autonomous results
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'pass'),
      COUNT(*) FILTER (WHERE status = 'fail'),
      COUNT(*) FILTER (WHERE status = 'na')
    INTO v_total, v_passed, v_failed, v_na
    FROM public.autonomous_check_results
    WHERE session_id = p_session_id;
  END IF;
  
  -- Update session summary
  UPDATE public.check_sheet_sessions
  SET 
    total_items = v_total,
    items_passed = v_passed,
    items_failed = v_failed,
    items_na = v_na,
    overall_passed = (v_failed = 0 AND v_total > 0),
    updated_at = now()
  WHERE id = p_session_id;
  
  v_result := json_build_object(
    'session_id', p_session_id,
    'total', v_total,
    'passed', v_passed,
    'failed', v_failed,
    'na', v_na,
    'overall_passed', (v_failed = 0 AND v_total > 0)
  );
  
  RETURN v_result;
END; $$;

GRANT EXECUTE ON FUNCTION public.calculate_session_summary(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7.2 Trigger to auto-calculate session summary on result insert/update
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_session_summary()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Recalculate summary for the session
  PERFORM public.calculate_session_summary(COALESCE(NEW.session_id, OLD.session_id));
  RETURN NEW;
END; $$;

-- Apply trigger to fivef5l_check_results
DROP TRIGGER IF EXISTS tg_f5l_results_summary ON public.fivef5l_check_results;
CREATE TRIGGER tg_f5l_results_summary
  AFTER INSERT OR UPDATE OR DELETE ON public.fivef5l_check_results
  FOR EACH ROW EXECUTE FUNCTION public.update_session_summary();

-- Apply trigger to autonomous_check_results
DROP TRIGGER IF EXISTS tg_auto_results_summary ON public.autonomous_check_results;
CREATE TRIGGER tg_auto_results_summary
  AFTER INSERT OR UPDATE OR DELETE ON public.autonomous_check_results
  FOR EACH ROW EXECUTE FUNCTION public.update_session_summary();

-- =============================================================================
-- SECTION 8: Data Migration from Old Structure (Optional)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 8.1 Migrate existing check_sheet_results to new structure
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_old_result RECORD;
  v_session_id UUID;
  v_session_type TEXT;
BEGIN
  -- Only migrate if old table has data and new table is empty
  IF EXISTS (SELECT 1 FROM public.check_sheet_results LIMIT 1) 
     AND NOT EXISTS (SELECT 1 FROM public.check_sheet_sessions LIMIT 1) THEN
    
    FOR v_old_result IN 
      SELECT * FROM public.check_sheet_results
    LOOP
      -- Determine session type from template
      SELECT 
        CASE 
          WHEN code = '5F' THEN '5F'
          WHEN code = '5L' THEN '5L'
          ELSE 'AUTO'
        END,
        code
      INTO v_session_type, v_session_type
      FROM public.check_sheet_templates
      WHERE id = v_old_result.template_id;
      
      -- Create session
      INSERT INTO public.check_sheet_sessions (
        shift_run_id, session_type, template_code, line_id,
        status, started_at, completed_at,
        overall_passed, checked_by_operator_id
      )
      SELECT 
        v_old_result.shift_run_id,
        v_session_type,
        v_session_type,
        sr.line_id,
        'completed',
        v_old_result.checked_at,
        v_old_result.checked_at,
        v_old_result.passed,
        v_old_result.checked_by_operator_id
      FROM public.shift_runs sr
      WHERE sr.id = v_old_result.shift_run_id
      RETURNING id INTO v_session_id;
      
      -- Create placeholder item results (all items marked as pass/fail based on old result)
      IF v_session_type IN ('5F', '5L') THEN
        INSERT INTO public.fivef5l_check_results (
          session_id, item_id, status, checked_at, checked_by_operator_id
        )
        SELECT 
          v_session_id,
          i.id,
          CASE WHEN v_old_result.passed THEN 'pass' ELSE 'fail' END,
          v_old_result.checked_at,
          v_old_result.checked_by_operator_id
        FROM public.fivef5l_check_items i
        JOIN public.shift_runs sr ON sr.id = v_old_result.shift_run_id
        WHERE i.line_id = sr.line_id;
      END IF;
    END LOOP;
    
    RAISE NOTICE 'Migrated % check sheet results to new structure', 
      (SELECT COUNT(*) FROM public.check_sheet_results);
  END IF;
END $$;

-- =============================================================================
-- SECTION 9: Realtime Subscriptions
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.check_sheet_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fivef5l_check_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.measurement_records;

-- =============================================================================
-- SECTION 10: Comments for Documentation
-- =============================================================================

COMMENT ON TABLE public.check_sheet_sessions IS 
  'Groups check sheet results into sessions. One session per 5F/5L/Autonomous check per shift run.';

COMMENT ON TABLE public.fivef5l_check_results IS 
  'Item-level results for 5F5L inspections. Enables traceability to individual checking points.';

COMMENT ON TABLE public.measurement_records IS 
  'Detailed measurement records with instrument tracking. Required for ISO 9001 calibration traceability.';

COMMENT ON COLUMN public.ng_entries.lot_number IS 
  'Material lot number for traceability to raw material batch.';

COMMENT ON COLUMN public.ng_entries.serial_number IS 
  'Unit serial number for individual product traceability.';

-- =============================================================================
-- DONE - Phase 2 Complete
-- =============================================================================

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES (run after migration)
-- =============================================================================

-- Check new tables created
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('check_sheet_sessions', 'fivef5l_check_results', 'measurement_records')
-- ORDER BY table_name;

-- Check measurement fields added
-- SELECT table_name, column_name 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND column_name IN ('measurement_value', 'lot_number', 'serial_number', 'workstation_id')
-- ORDER BY table_name, column_name;

-- Check data migration (if old data existed)
-- SELECT 
--   (SELECT COUNT(*) FROM public.check_sheet_results) as old_count,
--   (SELECT COUNT(*) FROM public.check_sheet_sessions) as new_sessions,
--   (SELECT COUNT(*) FROM public.fivef5l_check_results) as new_results;