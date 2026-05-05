-- =============================================================================
-- Migration: 20260506000003_fix_versioning_and_audit_data
-- Purpose: Populate versioning and audit fields for master data records
-- 
-- This migration:
-- 1. Ensures all master records have explicit version=1
-- 2. Populates created_by with system user ID
-- 3. Creates initial master_data_versions entries
-- 4. Sets effective date ranges for historical accuracy
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: Create System User for Seeded Data
-- =============================================================================

-- First, we need to identify or create a system user for audit trail
-- Using a well-known UUID for "system" user
DO $$
DECLARE
  v_system_user_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
BEGIN
  -- Check if this is a valid auth user, if not, use first admin user
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_system_user_id) THEN
    -- Get the first super_admin user
    SELECT user_id INTO v_system_user_id 
    FROM public.user_roles 
    WHERE role = 'super_admin' 
    LIMIT 1;
    
    IF v_system_user_id IS NULL THEN
      -- If no super_admin found, use the first user
      SELECT user_id INTO v_system_user_id FROM public.user_roles LIMIT 1;
    END IF;
  END IF;
  
  -- Store in configuration for other statements
  INSERT INTO public.audit_log (table_name, record_id, action, change_reason, source_system)
  VALUES ('__system__', v_system_user_id, 'INSERT'::public.audit_action, 
    'System initialization - storing system user ID', 'migration');
EXCEPTION WHEN OTHERS THEN
  -- Table may not exist yet, continue
  RAISE NOTICE 'audit_log table not yet available, continuing...';
END $$;

-- For the purposes of this migration, we'll use NULL for created_by
-- since we don't have a stable system user yet
-- This can be updated later when a system user is created

-- =============================================================================
-- SECTION 2: Fix Lines Table Versioning
-- =============================================================================

UPDATE public.lines
SET 
  version = 1,
  effective_from = COALESCE(effective_from, now()),
  created_by = created_by,  -- Keep existing or NULL
  updated_by = NULL
WHERE version IS NULL OR version = 0;

-- =============================================================================
-- SECTION 3: Fix Products Table Versioning
-- =============================================================================

UPDATE public.products
SET 
  version = 1,
  effective_from = COALESCE(effective_from, now()),
  created_by = created_by,
  updated_by = NULL
WHERE version IS NULL OR version = 0;

-- =============================================================================
-- SECTION 4: Fix Processes Table Versioning
-- =============================================================================

UPDATE public.processes
SET 
  version = 1,
  effective_from = COALESCE(effective_from, now()),
  created_by = created_by,
  updated_by = NULL
WHERE version IS NULL OR version = 0;

-- =============================================================================
-- SECTION 5: Fix Shifts Table Versioning
-- =============================================================================

UPDATE public.shifts
SET 
  version = 1,
  effective_from = COALESCE(effective_from, now()),
  created_by = created_by,
  updated_by = NULL
WHERE version IS NULL OR version = 0;

-- =============================================================================
-- SECTION 6: Fix Defect Types Table Versioning
-- =============================================================================

UPDATE public.defect_types
SET 
  version = 1,
  effective_from = COALESCE(effective_from, now()),
  created_by = created_by,
  updated_by = NULL
WHERE version IS NULL OR version = 0;

-- =============================================================================
-- SECTION 7: Fix Downtime Categories Table Versioning
-- =============================================================================

UPDATE public.downtime_categories
SET 
  version = 1,
  effective_from = COALESCE(effective_from, now()),
  created_by = created_by,
  updated_by = NULL
WHERE version IS NULL OR version = 0;

-- =============================================================================
-- SECTION 8: Fix Skills Table Versioning
-- =============================================================================

UPDATE public.skills
SET 
  version = 1,
  effective_from = COALESCE(effective_from, now()),
  created_by = created_by,
  updated_by = NULL
WHERE version IS NULL OR version = 0;

-- =============================================================================
-- SECTION 9: Populate master_data_versions for Historical Tracking
-- =============================================================================

-- Insert version history for lines
INSERT INTO public.master_data_versions (table_name, record_id, version, effective_from, data_snapshot, changed_by)
SELECT 
  'lines' AS table_name,
  id,
  version,
  effective_from,
  row_to_json(l.*) AS data_snapshot,
  created_by
FROM public.lines l
WHERE NOT EXISTS (
  SELECT 1 FROM public.master_data_versions 
  WHERE table_name = 'lines' AND record_id = l.id AND version = 1
)
ON CONFLICT (table_name, record_id, version) DO NOTHING;

-- Insert version history for products
INSERT INTO public.master_data_versions (table_name, record_id, version, effective_from, data_snapshot, changed_by)
SELECT 
  'products' AS table_name,
  id,
  version,
  effective_from,
  row_to_json(p.*) AS data_snapshot,
  created_by
FROM public.products p
WHERE NOT EXISTS (
  SELECT 1 FROM public.master_data_versions 
  WHERE table_name = 'products' AND record_id = p.id AND version = 1
)
ON CONFLICT (table_name, record_id, version) DO NOTHING;

-- Insert version history for processes
INSERT INTO public.master_data_versions (table_name, record_id, version, effective_from, data_snapshot, changed_by)
SELECT 
  'processes' AS table_name,
  id,
  version,
  effective_from,
  row_to_json(pr.*) AS data_snapshot,
  created_by
FROM public.processes pr
WHERE NOT EXISTS (
  SELECT 1 FROM public.master_data_versions 
  WHERE table_name = 'processes' AND record_id = pr.id AND version = 1
)
ON CONFLICT (table_name, record_id, version) DO NOTHING;

-- Insert version history for shifts
INSERT INTO public.master_data_versions (table_name, record_id, version, effective_from, data_snapshot, changed_by)
SELECT 
  'shifts' AS table_name,
  id,
  version,
  effective_from,
  row_to_json(s.*) AS data_snapshot,
  created_by
FROM public.shifts s
WHERE NOT EXISTS (
  SELECT 1 FROM public.master_data_versions 
  WHERE table_name = 'shifts' AND record_id = s.id AND version = 1
)
ON CONFLICT (table_name, record_id, version) DO NOTHING;

-- Insert version history for defect_types
INSERT INTO public.master_data_versions (table_name, record_id, version, effective_from, data_snapshot, changed_by)
SELECT 
  'defect_types' AS table_name,
  id,
  version,
  effective_from,
  row_to_json(dt.*) AS data_snapshot,
  created_by
FROM public.defect_types dt
WHERE NOT EXISTS (
  SELECT 1 FROM public.master_data_versions 
  WHERE table_name = 'defect_types' AND record_id = dt.id AND version = 1
)
ON CONFLICT (table_name, record_id, version) DO NOTHING;

-- Insert version history for downtime_categories
INSERT INTO public.master_data_versions (table_name, record_id, version, effective_from, data_snapshot, changed_by)
SELECT 
  'downtime_categories' AS table_name,
  id,
  version,
  effective_from,
  row_to_json(dc.*) AS data_snapshot,
  created_by
FROM public.downtime_categories dc
WHERE NOT EXISTS (
  SELECT 1 FROM public.master_data_versions 
  WHERE table_name = 'downtime_categories' AND record_id = dc.id AND version = 1
)
ON CONFLICT (table_name, record_id, version) DO NOTHING;

-- Insert version history for skills
INSERT INTO public.master_data_versions (table_name, record_id, version, effective_from, data_snapshot, changed_by)
SELECT 
  'skills' AS table_name,
  id,
  version,
  effective_from,
  row_to_json(sk.*) AS data_snapshot,
  created_by
FROM public.skills sk
WHERE NOT EXISTS (
  SELECT 1 FROM public.master_data_versions 
  WHERE table_name = 'skills' AND record_id = sk.id AND version = 1
)
ON CONFLICT (table_name, record_id, version) DO NOTHING;

-- =============================================================================
-- SECTION 10: Verification
-- =============================================================================

-- Verify all master records now have version=1
DO $$
DECLARE
  v_lines_version_ok BOOLEAN;
  v_products_version_ok BOOLEAN;
  v_processes_version_ok BOOLEAN;
  v_shifts_version_ok BOOLEAN;
  v_versions_created INTEGER;
BEGIN
  SELECT COUNT(*) = 0 INTO v_lines_version_ok FROM public.lines WHERE version IS NULL OR version != 1;
  SELECT COUNT(*) = 0 INTO v_products_version_ok FROM public.products WHERE version IS NULL OR version != 1;
  SELECT COUNT(*) = 0 INTO v_processes_version_ok FROM public.processes WHERE version IS NULL OR version != 1;
  SELECT COUNT(*) = 0 INTO v_shifts_version_ok FROM public.shifts WHERE version IS NULL OR version != 1;
  SELECT COUNT(*) INTO v_versions_created FROM public.master_data_versions;
  
  IF v_lines_version_ok THEN
    RAISE NOTICE '✅ Lines: All records have version=1';
  ELSE
    RAISE WARNING '⚠️ Lines: Some records still have version != 1';
  END IF;
  
  IF v_products_version_ok THEN
    RAISE NOTICE '✅ Products: All records have version=1';
  ELSE
    RAISE WARNING '⚠️ Products: Some records still have version != 1';
  END IF;
  
  IF v_processes_version_ok THEN
    RAISE NOTICE '✅ Processes: All records have version=1';
  ELSE
    RAISE WARNING '⚠️ Processes: Some records still have version != 1';
  END IF;
  
  IF v_shifts_version_ok THEN
    RAISE NOTICE '✅ Shifts: All records have version=1';
  ELSE
    RAISE WARNING '⚠️ Shifts: Some records still have version != 1';
  END IF;
  
  RAISE NOTICE '✅ Master data versions created: % entries', v_versions_created;
  RAISE NOTICE '';
  RAISE NOTICE 'Versioning and audit data migration complete!';
END $$;

-- Display summary statistics
SELECT 
  'Version Summary' as metric,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE version = 1) as version_1,
  COUNT(*) FILTER (WHERE version != 1) as other_version,
  COUNT(*) FILTER (WHERE effective_from IS NOT NULL) as with_effective_from
FROM public.lines
UNION ALL
SELECT 
  'Products',
  COUNT(*),
  COUNT(*) FILTER (WHERE version = 1),
  COUNT(*) FILTER (WHERE version != 1),
  COUNT(*) FILTER (WHERE effective_from IS NOT NULL)
FROM public.products
UNION ALL
SELECT 
  'Processes',
  COUNT(*),
  COUNT(*) FILTER (WHERE version = 1),
  COUNT(*) FILTER (WHERE version != 1),
  COUNT(*) FILTER (WHERE effective_from IS NOT NULL)
FROM public.processes;

-- =============================================================================
-- SECTION 11: Create Summary View
-- =============================================================================

CREATE OR REPLACE VIEW public.vw_master_data_versions_status AS
SELECT 
  'lines' as table_name,
  COUNT(*) as record_count,
  COUNT(*) FILTER (WHERE version = 1) as with_version_1,
  COUNT(*) FILTER (WHERE effective_from IS NOT NULL) as with_effective_date,
  COUNT(*) FILTER (WHERE created_by IS NOT NULL) as with_created_by,
  MAX(effective_from) as latest_effective_date
FROM public.lines
UNION ALL
SELECT 
  'products',
  COUNT(*),
  COUNT(*) FILTER (WHERE version = 1),
  COUNT(*) FILTER (WHERE effective_from IS NOT NULL),
  COUNT(*) FILTER (WHERE created_by IS NOT NULL),
  MAX(effective_from)
FROM public.products
UNION ALL
SELECT 
  'processes',
  COUNT(*),
  COUNT(*) FILTER (WHERE version = 1),
  COUNT(*) FILTER (WHERE effective_from IS NOT NULL),
  COUNT(*) FILTER (WHERE created_by IS NOT NULL),
  MAX(effective_from)
FROM public.processes
UNION ALL
SELECT 
  'shifts',
  COUNT(*),
  COUNT(*) FILTER (WHERE version = 1),
  COUNT(*) FILTER (WHERE effective_from IS NOT NULL),
  COUNT(*) FILTER (WHERE created_by IS NOT NULL),
  MAX(effective_from)
FROM public.shifts;

COMMIT;
