-- =============================================================================
-- ROLLBACK SCRIPT: Phase 1 - Foundation & Versioning
-- 
-- This script safely reverts all changes made in Phase 1 migration.
-- Can be run at any time without data loss.
-- 
-- IMPORTANT: Run this ONLY if you need to rollback Phase 1.
-- All new tables and columns will be dropped, but existing data is preserved.
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: Drop Version Control Triggers
-- =============================================================================

DROP TRIGGER IF EXISTS tg_lines_version ON public.lines;
DROP TRIGGER IF EXISTS tg_products_version ON public.products;
DROP TRIGGER IF EXISTS tg_processes_version ON public.processes;
DROP TRIGGER IF EXISTS tg_workstations_version ON public.workstations;
DROP TRIGGER IF EXISTS tg_defect_types_version ON public.defect_types;
DROP TRIGGER IF EXISTS tg_downtime_categories_version ON public.downtime_categories;

-- =============================================================================
-- SECTION 2: Drop Helper Functions
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_version_history(TEXT, UUID);
DROP FUNCTION IF EXISTS public.get_version_at_date(TEXT, UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_active_version(TEXT, UUID);
DROP FUNCTION IF EXISTS public.archive_master_data_version();

-- =============================================================================
-- SECTION 3: Drop New Tables (CASCADE to cache_control dependencies)
-- =============================================================================

DROP TABLE IF EXISTS public.workstation_parameters CASCADE;
DROP TABLE IF EXISTS public.workstations CASCADE;
DROP TABLE IF EXISTS public.master_data_versions CASCADE;

-- =============================================================================
-- SECTION 4: Remove Versioning Columns from Master Tables
-- =============================================================================

-- Lines
ALTER TABLE public.lines 
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS effective_from,
  DROP COLUMN IF EXISTS effective_to,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS updated_by;

DROP INDEX IF EXISTS idx_lines_effective;

-- Products
ALTER TABLE public.products 
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS effective_from,
  DROP COLUMN IF EXISTS effective_to,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS updated_by;

DROP INDEX IF EXISTS idx_products_effective;

-- Processes
ALTER TABLE public.processes 
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS effective_from,
  DROP COLUMN IF EXISTS effective_to,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS updated_by;

DROP INDEX IF EXISTS idx_processes_effective;

-- Shifts
ALTER TABLE public.shifts 
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS effective_from,
  DROP COLUMN IF EXISTS effective_to;

DROP INDEX IF EXISTS idx_shifts_effective;

-- Defect Types
ALTER TABLE public.defect_types 
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS effective_from,
  DROP COLUMN IF EXISTS effective_to,
  DROP COLUMN IF EXISTS severity_level,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS updated_by;

DROP INDEX IF EXISTS idx_defect_types_effective;

-- Downtime Categories
ALTER TABLE public.downtime_categories 
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS effective_from,
  DROP COLUMN IF EXISTS effective_to,
  DROP COLUMN IF EXISTS severity_level,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS updated_by;

DROP INDEX IF EXISTS idx_downtime_categories_effective;

-- Skills
ALTER TABLE public.skills 
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS effective_from,
  DROP COLUMN IF EXISTS effective_to,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS updated_by;

DROP INDEX IF EXISTS idx_skills_effective;

-- =============================================================================
-- SECTION 5: Remove from Realtime Publication
-- =============================================================================

ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.workstations;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.workstation_parameters;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.master_data_versions;

-- =============================================================================
-- DONE - Phase 1 Rollback Complete
-- =============================================================================

COMMIT;

-- Verification: Check that versioning columns are removed
-- SELECT table_name, column_name 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND column_name IN ('version', 'effective_from', 'effective_to')
-- ORDER BY table_name;

-- Should return 0 rows if rollback successful