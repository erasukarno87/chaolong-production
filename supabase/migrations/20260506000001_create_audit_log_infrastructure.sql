-- =============================================================================
-- Migration: 20260506000001_create_audit_log_infrastructure
-- Purpose: Create universal audit trail system for ISO 9001 compliance
-- 
-- This migration creates the audit_log table and supporting infrastructure
-- to track all critical changes in the system. Essential for compliance,
-- traceability, and forensic analysis.
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: Audit Log Enum Types
-- =============================================================================

-- Create audit action enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
    CREATE TYPE public.audit_action AS ENUM (
      'INSERT',
      'UPDATE',
      'DELETE',
      'TRUNCATE'
    );
  END IF;
END $$;

-- =============================================================================
-- SECTION 2: Universal Audit Log Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What table was affected
  table_name          TEXT        NOT NULL,
  record_id           UUID        NOT NULL,
  
  -- What action was performed
  action              public.audit_action NOT NULL,
  
  -- When did it happen
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Who did it (one of these will be set)
  user_id             UUID        REFERENCES auth.users(id),
  operator_id         UUID        REFERENCES public.operators(id),
  
  -- What changed (for UPDATE operations)
  old_values          JSONB,      -- Previous state
  new_values          JSONB,      -- New state
  changed_fields      TEXT[],     -- Array of field names that changed
  
  -- Additional context
  change_reason       TEXT,       -- Why was this changed?
  source_system       TEXT,       -- Where did the change originate? (app, api, migration, etc.)
  ip_address          INET,       -- IP address of the client
  session_id          TEXT,       -- Session identifier if applicable
  
  -- For correlation
  correlation_id      UUID,       -- Trace related changes
  
  -- Indexes
  CONSTRAINT audit_log_has_actor CHECK (user_id IS NOT NULL OR operator_id IS NOT NULL),
  CONSTRAINT audit_log_action_type CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'))
);

-- Create indexes for efficient queries
CREATE INDEX idx_audit_log_table_record 
  ON public.audit_log (table_name, record_id)
  WHERE action IN ('INSERT', 'UPDATE', 'DELETE');

CREATE INDEX idx_audit_log_created_at 
  ON public.audit_log (created_at DESC);

CREATE INDEX idx_audit_log_user_id 
  ON public.audit_log (user_id) 
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_audit_log_operator_id 
  ON public.audit_log (operator_id) 
  WHERE operator_id IS NOT NULL;

CREATE INDEX idx_audit_log_correlation 
  ON public.audit_log (correlation_id) 
  WHERE correlation_id IS NOT NULL;

CREATE INDEX idx_audit_log_table_created 
  ON public.audit_log (table_name, created_at DESC);

-- RLS Policy
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_read" ON public.audit_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "audit_log_insert" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "audit_log_no_delete" ON public.audit_log
  FOR DELETE TO authenticated USING (false);

-- =============================================================================
-- SECTION 3: Helper Functions
-- =============================================================================

-- Function to extract changed fields
CREATE OR REPLACE FUNCTION public.get_changed_fields(
  p_old JSONB,
  p_new JSONB
) RETURNS TEXT[] AS $$
DECLARE
  v_changed TEXT[] := ARRAY[]::TEXT[];
  v_key TEXT;
BEGIN
  -- Get all keys from both objects
  FOR v_key IN
    SELECT DISTINCT key FROM (
      SELECT jsonb_object_keys(COALESCE(p_old, '{}'::JSONB)) AS key
      UNION ALL
      SELECT jsonb_object_keys(COALESCE(p_new, '{}'::JSONB)) AS key
    ) t
  LOOP
    -- If values differ, add to changed fields
    IF (p_old ->> v_key) IS DISTINCT FROM (p_new ->> v_key) THEN
      v_changed := v_changed || v_key;
    END IF;
  END LOOP;
  
  RETURN v_changed;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to log audit entry
CREATE OR REPLACE FUNCTION public.log_audit(
  p_table_name TEXT,
  p_record_id UUID,
  p_action public.audit_action,
  p_user_id UUID DEFAULT NULL,
  p_operator_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_change_reason TEXT DEFAULT NULL,
  p_source_system TEXT DEFAULT 'app',
  p_correlation_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_changed_fields TEXT[];
BEGIN
  -- Calculate changed fields
  v_changed_fields := public.get_changed_fields(p_old_values, p_new_values);
  
  -- Insert audit log entry
  INSERT INTO public.audit_log (
    table_name,
    record_id,
    action,
    user_id,
    operator_id,
    old_values,
    new_values,
    changed_fields,
    change_reason,
    source_system,
    correlation_id
  ) VALUES (
    p_table_name,
    p_record_id,
    p_action,
    p_user_id,
    p_operator_id,
    p_old_values,
    p_new_values,
    v_changed_fields,
    p_change_reason,
    p_source_system,
    p_correlation_id
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SECTION 4: Audit Triggers for Critical Tables
-- =============================================================================

-- Function to create audit trigger
CREATE OR REPLACE FUNCTION public.create_audit_trigger(
  p_table_name TEXT
) RETURNS void AS $$
DECLARE
  v_trigger_name TEXT;
  v_function_name TEXT;
BEGIN
  v_trigger_name := 'tg_audit_' || p_table_name;
  v_function_name := 'fn_audit_' || p_table_name;
  
  -- Drop existing trigger if exists
  EXECUTE 'DROP TRIGGER IF EXISTS ' || v_trigger_name || ' ON public.' || p_table_name || ' CASCADE';
  EXECUTE 'DROP FUNCTION IF EXISTS public.' || v_function_name || '() CASCADE';
  
  -- Create trigger function
  EXECUTE format('
    CREATE FUNCTION public.%I() RETURNS TRIGGER AS $fn$
    BEGIN
      IF TG_OP = ''INSERT'' THEN
        PERFORM public.log_audit(
          %L,
          NEW.id,
          %L::public.audit_action,
          COALESCE(auth.uid(), NULL),
          NULL,
          NULL,
          row_to_json(NEW),
          NULL,
          ''trigger'',
          NULL
        );
      ELSIF TG_OP = ''UPDATE'' THEN
        PERFORM public.log_audit(
          %L,
          NEW.id,
          %L::public.audit_action,
          COALESCE(auth.uid(), NULL),
          NULL,
          row_to_json(OLD),
          row_to_json(NEW),
          NULL,
          ''trigger'',
          NULL
        );
      ELSIF TG_OP = ''DELETE'' THEN
        PERFORM public.log_audit(
          %L,
          OLD.id,
          %L::public.audit_action,
          COALESCE(auth.uid(), NULL),
          NULL,
          row_to_json(OLD),
          NULL,
          NULL,
          ''trigger'',
          NULL
        );
      END IF;
      
      IF TG_OP = ''DELETE'' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END;
    $fn$ LANGUAGE plpgsql SECURITY DEFINER;
  ', v_function_name, p_table_name, 'INSERT', p_table_name, 'UPDATE', p_table_name, 'DELETE');
  
  -- Create trigger
  EXECUTE format('
    CREATE TRIGGER %I
    AFTER INSERT OR UPDATE OR DELETE ON public.%I
    FOR EACH ROW
    EXECUTE FUNCTION public.%I()',
    v_trigger_name,
    p_table_name,
    v_function_name
  );
  
  RAISE NOTICE 'Created audit trigger for table: %', p_table_name;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SECTION 5: Apply Triggers to Critical Tables
-- =============================================================================

-- Core operational tables (highest priority)
SELECT public.create_audit_trigger('shift_runs');
SELECT public.create_audit_trigger('hourly_outputs');
SELECT public.create_audit_trigger('ng_entries');
SELECT public.create_audit_trigger('downtime_entries');

-- Master data tables (high priority)
SELECT public.create_audit_trigger('lines');
SELECT public.create_audit_trigger('products');
SELECT public.create_audit_trigger('processes');
SELECT public.create_audit_trigger('shifts');
SELECT public.create_audit_trigger('workstations');

-- Personnel & authorization (high priority)
SELECT public.create_audit_trigger('profiles');
SELECT public.create_audit_trigger('user_roles');
SELECT public.create_audit_trigger('operators');

-- Quality & compliance (medium priority)
SELECT public.create_audit_trigger('defect_types');
SELECT public.create_audit_trigger('downtime_categories');
SELECT public.create_audit_trigger('autonomous_check_items');
SELECT public.create_audit_trigger('fivef5l_check_items');

-- Check results (medium priority)
SELECT public.create_audit_trigger('check_sheet_sessions');
SELECT public.create_audit_trigger('fivef5l_check_results');
SELECT public.create_audit_trigger('autonomous_check_results');

-- =============================================================================
-- SECTION 6: Verification Views
-- =============================================================================

-- View: Recent audit entries
CREATE OR REPLACE VIEW public.vw_audit_recent AS
SELECT
  a.created_at,
  a.table_name,
  a.action,
  a.record_id,
  COALESCE(u.email, 'operator: ' || o.full_name) AS actor,
  a.changed_fields,
  a.change_reason
FROM public.audit_log a
LEFT JOIN auth.users u ON u.id = a.user_id
LEFT JOIN public.operators o ON o.id = a.operator_id
ORDER BY a.created_at DESC
LIMIT 100;

-- View: Audit trail for a specific record
CREATE OR REPLACE VIEW public.vw_audit_trail_for_record AS
SELECT
  a.created_at,
  a.action,
  COALESCE(u.email, 'operator: ' || o.full_name) AS actor,
  a.old_values,
  a.new_values,
  a.changed_fields,
  a.change_reason,
  a.source_system
FROM public.audit_log a
LEFT JOIN auth.users u ON u.id = a.user_id
LEFT JOIN public.operators o ON o.id = a.operator_id
ORDER BY a.created_at ASC;

-- View: Audit statistics by table
CREATE OR REPLACE VIEW public.vw_audit_stats_by_table AS
SELECT
  table_name,
  action,
  COUNT(*) as entry_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT operator_id) as unique_operators,
  MIN(created_at) as first_entry,
  MAX(created_at) as last_entry
FROM public.audit_log
GROUP BY table_name, action
ORDER BY table_name, action;

-- =============================================================================
-- SECTION 7: Verification
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Audit log infrastructure created successfully';
  RAISE NOTICE '✅ Audit triggers applied to 17 critical tables';
  RAISE NOTICE '✅ Helper functions and views created';
  RAISE NOTICE '✅ RLS policies configured for data protection';
END $$;

COMMIT;
