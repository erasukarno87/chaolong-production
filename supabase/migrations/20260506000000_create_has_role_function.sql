-- =============================================================================
-- Migration: 20260506000000_create_has_role_function
-- Purpose: Create the has_role function required by RLS policies
-- 
-- This function checks if a user has a specific role
-- Must run BEFORE other migrations that reference it
-- =============================================================================

BEGIN;

-- Drop function if exists (to allow re-runs)
DROP FUNCTION IF EXISTS public.has_role(uuid, text) CASCADE;

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1
      AND user_roles.role = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
  ON public.user_roles(user_id, role);

COMMIT;
