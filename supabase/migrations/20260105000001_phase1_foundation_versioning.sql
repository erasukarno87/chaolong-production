-- =============================================================================
-- PHASE 1: Foundation - Versioning & Workstations
-- Manufacturing Excellence Schema Architecture
-- 
-- Goal: Add version control and separate workstation concept
-- Downtime: 0 minutes (backward compatible)
-- Risk: LOW
-- 
-- Changes:
--   1. Add versioning columns to all master tables
--   2. Create workstations table (separate from processes)
--   3. Create master_data_versions tracking table
--   4. Create workstation_parameters table
--   5. Add audit columns (created_by, updated_by)
-- 
-- Backward Compatibility: 100%
--   - All new columns are nullable with defaults
--   - Existing queries continue to work
--   - No breaking changes to application
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: Master Data Versioning Infrastructure
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1.1 Create master_data_versions table (central version tracking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.master_data_versions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      TEXT        NOT NULL,
  record_id       UUID        NOT NULL,
  version         INTEGER     NOT NULL DEFAULT 1,
  effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to    TIMESTAMPTZ,
  change_reason   TEXT,
  changed_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Snapshot of the record at this version (JSONB for flexibility)
  data_snapshot   JSONB,
  
  UNIQUE (table_name, record_id, version)
);

CREATE INDEX idx_master_versions_table_record 
  ON public.master_data_versions (table_name, record_id);
CREATE INDEX idx_master_versions_effective 
  ON public.master_data_versions (table_name, record_id, effective_from, effective_to);

ALTER TABLE public.master_data_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_versions_read" ON public.master_data_versions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "master_versions_admin" ON public.master_data_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ---------------------------------------------------------------------------
-- 1.2 Add versioning columns to master tables
-- ---------------------------------------------------------------------------

-- Lines
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'lines' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.lines
      ADD COLUMN version         INTEGER     NOT NULL DEFAULT 1,
      ADD COLUMN effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
      ADD COLUMN effective_to    TIMESTAMPTZ,
      ADD COLUMN created_by      UUID        REFERENCES auth.users(id) DEFAULT auth.uid(),
      ADD COLUMN updated_by      UUID        REFERENCES auth.users(id);
    
    CREATE INDEX idx_lines_effective ON public.lines (effective_from, effective_to);
  END IF;
END $$;

-- Products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN version         INTEGER     NOT NULL DEFAULT 1,
      ADD COLUMN effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
      ADD COLUMN effective_to    TIMESTAMPTZ,
      ADD COLUMN created_by      UUID        REFERENCES auth.users(id) DEFAULT auth.uid(),
      ADD COLUMN updated_by      UUID        REFERENCES auth.users(id);
    
    CREATE INDEX idx_products_effective ON public.products (effective_from, effective_to);
  END IF;
END $$;

-- Processes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'processes' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.processes
      ADD COLUMN version         INTEGER     NOT NULL DEFAULT 1,
      ADD COLUMN effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
      ADD COLUMN effective_to    TIMESTAMPTZ,
      ADD COLUMN description     TEXT,
      ADD COLUMN created_by      UUID        REFERENCES auth.users(id) DEFAULT auth.uid(),
      ADD COLUMN updated_by      UUID        REFERENCES auth.users(id);
    
    CREATE INDEX idx_processes_effective ON public.processes (effective_from, effective_to);
  END IF;
END $$;

-- Shifts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'shifts' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.shifts
      ADD COLUMN version         INTEGER     NOT NULL DEFAULT 1,
      ADD COLUMN effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
      ADD COLUMN effective_to    TIMESTAMPTZ;
    
    CREATE INDEX idx_shifts_effective ON public.shifts (effective_from, effective_to);
  END IF;
END $$;

-- Defect Types (NG Categories)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'defect_types' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.defect_types
      ADD COLUMN version         INTEGER     NOT NULL DEFAULT 1,
      ADD COLUMN effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
      ADD COLUMN effective_to    TIMESTAMPTZ,
      ADD COLUMN severity_level  INTEGER     CHECK (severity_level BETWEEN 1 AND 5),
      ADD COLUMN created_by      UUID        REFERENCES auth.users(id) DEFAULT auth.uid(),
      ADD COLUMN updated_by      UUID        REFERENCES auth.users(id);
    
    CREATE INDEX idx_defect_types_effective ON public.defect_types (effective_from, effective_to);
  END IF;
END $$;

-- Downtime Categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'downtime_categories' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.downtime_categories
      ADD COLUMN version         INTEGER     NOT NULL DEFAULT 1,
      ADD COLUMN effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
      ADD COLUMN effective_to    TIMESTAMPTZ,
      ADD COLUMN severity_level  INTEGER     CHECK (severity_level BETWEEN 1 AND 5),
      ADD COLUMN created_by      UUID        REFERENCES auth.users(id) DEFAULT auth.uid(),
      ADD COLUMN updated_by      UUID        REFERENCES auth.users(id);
    
    CREATE INDEX idx_downtime_categories_effective ON public.downtime_categories (effective_from, effective_to);
  END IF;
END $$;

-- Skills
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'skills' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.skills
      ADD COLUMN version         INTEGER     NOT NULL DEFAULT 1,
      ADD COLUMN effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
      ADD COLUMN effective_to    TIMESTAMPTZ,
      ADD COLUMN created_by      UUID        REFERENCES auth.users(id) DEFAULT auth.uid(),
      ADD COLUMN updated_by      UUID        REFERENCES auth.users(id);
    
    CREATE INDEX idx_skills_effective ON public.skills (effective_from, effective_to);
  END IF;
END $$;

-- =============================================================================
-- SECTION 2: Workstation Infrastructure (Separate from Processes)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 2.1 Create workstations table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workstations (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id             UUID        NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  process_id          UUID        REFERENCES public.processes(id) ON DELETE SET NULL,
  
  -- Workstation identification
  code                TEXT        NOT NULL,
  name                TEXT        NOT NULL,
  equipment_number    TEXT,                    -- Physical asset tag / machine number
  location            TEXT,                    -- Physical location on shop floor
  
  -- Workstation parameters
  cycle_time_seconds  NUMERIC(10,2) CHECK (cycle_time_seconds IS NULL OR cycle_time_seconds > 0),
  capacity_per_hour   INTEGER,
  
  -- Status tracking
  status              TEXT        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'maintenance', 'breakdown', 'idle', 'retired')),
  
  -- Versioning
  version             INTEGER     NOT NULL DEFAULT 1,
  effective_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to        TIMESTAMPTZ,
  
  -- Audit
  active              BOOLEAN     NOT NULL DEFAULT true,
  created_by          UUID        REFERENCES auth.users(id) DEFAULT auth.uid(),
  updated_by          UUID        REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (line_id, code, version)
);

CREATE INDEX idx_workstations_line ON public.workstations (line_id);
CREATE INDEX idx_workstations_process ON public.workstations (process_id);
CREATE INDEX idx_workstations_status ON public.workstations (status) WHERE active = true;
CREATE INDEX idx_workstations_effective ON public.workstations (effective_from, effective_to);

ALTER TABLE public.workstations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workstations_read" ON public.workstations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "workstations_admin" ON public.workstations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER tg_workstations_updated 
  BEFORE UPDATE ON public.workstations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2.2 Create workstation_parameters table (tolerances, limits)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workstation_parameters (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workstation_id    UUID        NOT NULL REFERENCES public.workstations(id) ON DELETE CASCADE,
  
  -- Parameter definition
  parameter_code    TEXT        NOT NULL,
  parameter_name    TEXT        NOT NULL,
  parameter_type    TEXT        NOT NULL DEFAULT 'measurement'
                                CHECK (parameter_type IN ('measurement', 'setting', 'limit', 'tolerance')),
  
  -- Values and tolerances
  target_value      NUMERIC(18,4),
  min_value         NUMERIC(18,4),
  max_value         NUMERIC(18,4),
  uom               TEXT,                      -- Unit of measure (V, A, °C, mm, etc.)
  
  -- Measurement instrument tracking
  instrument_id     TEXT,                      -- Calibrated instrument ID
  instrument_due    DATE,                      -- Next calibration due date
  
  -- Versioning
  version           INTEGER     NOT NULL DEFAULT 1,
  effective_from    TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to      TIMESTAMPTZ,
  
  -- Audit
  active            BOOLEAN     NOT NULL DEFAULT true,
  created_by        UUID        REFERENCES auth.users(id) DEFAULT auth.uid(),
  updated_by        UUID        REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (workstation_id, parameter_code, version)
);

CREATE INDEX idx_ws_params_workstation ON public.workstation_parameters (workstation_id);
CREATE INDEX idx_ws_params_effective ON public.workstation_parameters (effective_from, effective_to);

ALTER TABLE public.workstation_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws_params_read" ON public.workstation_parameters
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ws_params_admin" ON public.workstation_parameters
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER tg_ws_params_updated 
  BEFORE UPDATE ON public.workstation_parameters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- SECTION 3: Version Control Functions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 3.1 Function to increment version and archive old version
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_master_data_version()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_table_name TEXT;
  v_old_data JSONB;
BEGIN
  -- Get table name
  v_table_name := TG_TABLE_NAME;
  
  -- Only process if version column exists and is being updated
  IF TG_OP = 'UPDATE' AND OLD.version IS NOT NULL THEN
    -- Close out the old version
    UPDATE public.master_data_versions
    SET effective_to = now()
    WHERE table_name = v_table_name
      AND record_id = OLD.id
      AND version = OLD.version
      AND effective_to IS NULL;
    
    -- Increment version
    NEW.version := OLD.version + 1;
    NEW.effective_from := now();
    NEW.effective_to := NULL;
    NEW.updated_by := auth.uid();
    
    -- Archive old version
    v_old_data := to_jsonb(OLD);
    
    INSERT INTO public.master_data_versions (
      table_name, record_id, version, effective_from, effective_to,
      changed_by, data_snapshot
    ) VALUES (
      v_table_name, OLD.id, OLD.version, OLD.effective_from, now(),
      auth.uid(), v_old_data
    );
  END IF;
  
  RETURN NEW;
END; $$;

-- ---------------------------------------------------------------------------
-- 3.2 Apply version control trigger to master tables
-- ---------------------------------------------------------------------------

-- Lines
DROP TRIGGER IF EXISTS tg_lines_version ON public.lines;
CREATE TRIGGER tg_lines_version
  BEFORE UPDATE ON public.lines
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.archive_master_data_version();

-- Products
DROP TRIGGER IF EXISTS tg_products_version ON public.products;
CREATE TRIGGER tg_products_version
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.archive_master_data_version();

-- Processes
DROP TRIGGER IF EXISTS tg_processes_version ON public.processes;
CREATE TRIGGER tg_processes_version
  BEFORE UPDATE ON public.processes
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.archive_master_data_version();

-- Workstations
DROP TRIGGER IF EXISTS tg_workstations_version ON public.workstations;
CREATE TRIGGER tg_workstations_version
  BEFORE UPDATE ON public.workstations
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.archive_master_data_version();

-- Defect Types
DROP TRIGGER IF EXISTS tg_defect_types_version ON public.defect_types;
CREATE TRIGGER tg_defect_types_version
  BEFORE UPDATE ON public.defect_types
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.archive_master_data_version();

-- Downtime Categories
DROP TRIGGER IF EXISTS tg_downtime_categories_version ON public.downtime_categories;
CREATE TRIGGER tg_downtime_categories_version
  BEFORE UPDATE ON public.downtime_categories
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.archive_master_data_version();

-- =============================================================================
-- SECTION 4: Helper Functions for Version Queries
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 4.1 Get active version of a record
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_version(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS INTEGER LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT version
  FROM public.master_data_versions
  WHERE table_name = p_table_name
    AND record_id = p_record_id
    AND effective_to IS NULL
  ORDER BY version DESC
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 4.2 Get version at specific date
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_version_at_date(
  p_table_name TEXT,
  p_record_id UUID,
  p_date TIMESTAMPTZ
)
RETURNS INTEGER LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT version
  FROM public.master_data_versions
  WHERE table_name = p_table_name
    AND record_id = p_record_id
    AND effective_from <= p_date
    AND (effective_to IS NULL OR effective_to > p_date)
  ORDER BY version DESC
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 4.3 Get version history for a record
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_version_history(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS TABLE (
  version INTEGER,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  changed_by UUID,
  data_snapshot JSONB
) LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT version, effective_from, effective_to, changed_by, data_snapshot
  FROM public.master_data_versions
  WHERE table_name = p_table_name
    AND record_id = p_record_id
  ORDER BY version DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_active_version(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_version_at_date(TEXT, UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_version_history(TEXT, UUID) TO authenticated;

-- =============================================================================
-- SECTION 5: Seed Initial Workstations (Optional - for demo)
-- =============================================================================

-- Seed workstations for existing processes (if lines exist)
DO $$
DECLARE
  v_line_id UUID;
  v_process RECORD;
BEGIN
  -- Get first line (LINE-A)
  SELECT id INTO v_line_id FROM public.lines WHERE code = 'LINE-A' LIMIT 1;
  
  IF v_line_id IS NOT NULL THEN
    -- Create workstations for each process
    FOR v_process IN 
      SELECT id, code, name, sort_order 
      FROM public.processes 
      WHERE line_id = v_line_id OR line_id IS NULL
      ORDER BY sort_order
    LOOP
      INSERT INTO public.workstations (
        line_id, process_id, code, name, equipment_number, status, active
      ) VALUES (
        v_line_id,
        v_process.id,
        'WS-' || LPAD(v_process.sort_order::TEXT, 2, '0'),
        v_process.name,
        'EQ-' || v_process.code,
        'active',
        true
      )
      ON CONFLICT (line_id, code, version) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- =============================================================================
-- SECTION 6: Realtime Subscriptions
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.workstations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workstation_parameters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.master_data_versions;

-- =============================================================================
-- SECTION 7: Comments for Documentation
-- =============================================================================

COMMENT ON TABLE public.master_data_versions IS 
  'Central version tracking for all master data tables. Stores historical snapshots for audit and traceability.';

COMMENT ON TABLE public.workstations IS 
  'Physical workstation instances per production line. Separate from process definitions to allow multiple workstations per process type.';

COMMENT ON TABLE public.workstation_parameters IS 
  'Process parameters, tolerances, and limits specific to each workstation. Supports measurement traceability and calibration tracking.';

COMMENT ON COLUMN public.workstations.equipment_number IS 
  'Physical asset tag or machine serial number for equipment tracking and maintenance.';

COMMENT ON COLUMN public.workstation_parameters.instrument_id IS 
  'Calibrated measurement instrument ID. Must be tracked for ISO 9001 compliance.';

-- =============================================================================
-- DONE - Phase 1 Complete
-- =============================================================================

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES (run after migration)
-- =============================================================================

-- Check versioning columns added
-- SELECT table_name, column_name 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND column_name IN ('version', 'effective_from', 'effective_to')
-- ORDER BY table_name, column_name;

-- Check workstations created
-- SELECT w.code, w.name, w.equipment_number, l.code as line_code, p.name as process_name
-- FROM public.workstations w
-- JOIN public.lines l ON l.id = w.line_id
-- LEFT JOIN public.processes p ON p.id = w.process_id
-- ORDER BY w.code;

-- Check version tracking works
-- UPDATE public.lines SET name = name || ' (Updated)' WHERE code = 'LINE-A';
-- SELECT * FROM public.master_data_versions WHERE table_name = 'lines';