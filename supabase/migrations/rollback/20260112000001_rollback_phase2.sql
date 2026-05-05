-- =============================================================================
-- ROLLBACK SCRIPT: Phase 2 - Item-Level Traceability
-- 
-- This script safely reverts all changes made in Phase 2 migration.
-- Can be run at any time without data loss to old check_sheet_results.
-- 
-- IMPORTANT: Run this ONLY if you need to rollback Phase 2.
-- New tables will be dropped, but old check_sheet_results remains intact.
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: Drop Triggers
-- =============================================================================

DROP TRIGGER IF EXISTS tg_f5l_results_summary ON public.fivef5l_check_results;
DROP TRIGGER IF EXISTS tg_auto_results_summary ON public.autonomous_check_results;
DROP TRIGGER IF EXISTS tg_f5l_results_updated ON public.fivef5l_check_results;
DROP TRIGGER IF EXISTS tg_sessions_updated ON public.check_sheet_sessions;

-- =============================================================================
-- SECTION 2: Drop Functions
-- =============================================================================

DROP FUNCTION IF EXISTS public.update_session_summary();
DROP FUNCTION IF EXISTS public.calculate_session_summary(UUID);

-- =============================================================================
-- SECTION 3: Drop New Tables (CASCADE to cache_control dependencies)
-- =============================================================================

DROP TABLE IF EXISTS public.measurement_records CASCADE;
DROP TABLE IF EXISTS public.fivef5l_check_results CASCADE;
DROP TABLE IF EXISTS public.check_sheet_sessions CASCADE;

-- =============================================================================
-- SECTION 4: Remove Added Columns from Existing Tables
-- =============================================================================

-- fivef5l_check_items
ALTER TABLE public.fivef5l_check_items 
  DROP COLUMN IF EXISTS min_value,
  DROP COLUMN IF EXISTS max_value,
  DROP COLUMN IF EXISTS uom,
  DROP COLUMN IF EXISTS is_critical,
  DROP COLUMN IF EXISTS tolerance_pct;

-- autonomous_check_items
ALTER TABLE public.autonomous_check_items 
  DROP COLUMN IF EXISTS min_value,
  DROP COLUMN IF EXISTS max_value,
  DROP COLUMN IF EXISTS uom,
  DROP COLUMN IF EXISTS is_critical,
  DROP COLUMN IF EXISTS tolerance_pct,
  DROP COLUMN IF EXISTS instrument_id;

-- autonomous_check_results
ALTER TABLE public.autonomous_check_results 
  DROP COLUMN IF EXISTS session_id,
  DROP COLUMN IF EXISTS is_within_spec;

DROP INDEX IF EXISTS idx_auto_results_session;

-- ng_entries
ALTER TABLE public.ng_entries 
  DROP COLUMN IF EXISTS measurement_value,
  DROP COLUMN IF EXISTS target_value,
  DROP COLUMN IF EXISTS is_within_spec,
  DROP COLUMN IF EXISTS lot_number,
  DROP COLUMN IF EXISTS serial_number,
  DROP COLUMN IF EXISTS corrective_action,
  DROP COLUMN IF EXISTS root_cause_analysis;

DROP INDEX IF EXISTS idx_ng_lot;
DROP INDEX IF EXISTS idx_ng_serial;

-- hourly_outputs
ALTER TABLE public.hourly_outputs 
  DROP COLUMN IF EXISTS workstation_id;

DROP INDEX IF EXISTS idx_hourly_outputs_workstation;

-- ng_entries (workstation_id)
ALTER TABLE public.ng_entries 
  DROP COLUMN IF EXISTS workstation_id;

DROP INDEX IF EXISTS idx_ng_entries_workstation;

-- downtime_entries
ALTER TABLE public.downtime_entries 
  DROP COLUMN IF EXISTS workstation_id;

DROP INDEX IF EXISTS idx_downtime_entries_workstation;

-- =============================================================================
-- SECTION 5: Remove from Realtime Publication
-- =============================================================================

ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.check_sheet_sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.fivef5l_check_results;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.measurement_records;

-- =============================================================================
-- DONE - Phase 2 Rollback Complete
-- =============================================================================

COMMIT;

-- Verification: Check that new tables are cache_controld
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('check_sheet_sessions', 'fivef5l_check_results', 'measurement_records');
-- Should return 0 rows if rollback successful

-- Verify old check_sheet_results still exists
-- SELECT COUNT(*) FROM public.check_sheet_results;