-- =============================================================================
-- Migration: Add 2FA (Two-Factor Authentication) Support
-- Date: 2026-05-05
-- Purpose: Add TOTP and backup codes support for enhanced security
--
-- Changes:
--   1. Add twofa_secret column to store TOTP secret (base32 encoded)
--   2. Add twofa_backup_codes column (array of backup codes)
--   3. Add twofa_enabled flag
--   4. Add twofa_setup_at timestamp for audit trail
--   5. Add user_logs table for 2FA audit events
--
-- Downtime: 0 minutes (all columns nullable, backward compatible)
-- Risk: LOW
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Add 2FA columns to auth.users (via public.user_twofa table)
-- ─────────────────────────────────────────────────────────────────────────

-- Create a public table to track 2FA settings (since we can't modify auth.users directly)
CREATE TABLE IF NOT EXISTS public.user_twofa (
  user_id           UUID        PRIMARY KEY
    REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- TOTP secret (base32 encoded, ~160-bit = 26 chars)
  twofa_secret      TEXT,
  
  -- Array of 10 backup codes (8 chars each, uppercase alphanumeric)
  twofa_backup_codes TEXT[],
  
  -- Flag to track if 2FA is enabled
  twofa_enabled     BOOLEAN     NOT NULL DEFAULT false,
  
  -- When was 2FA setup completed
  twofa_setup_at    TIMESTAMPTZ,
  
  -- When was 2FA last verified (for activity tracking)
  last_verified_at  TIMESTAMPTZ,
  
  -- Metadata for audit/security
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_twofa_enabled 
  ON public.user_twofa (twofa_enabled);
CREATE INDEX idx_user_twofa_setup_at 
  ON public.user_twofa (twofa_setup_at);

ALTER TABLE public.user_twofa ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own 2FA settings
CREATE POLICY "user_twofa_own_only" ON public.user_twofa
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own 2FA settings
CREATE POLICY "user_twofa_update_own" ON public.user_twofa
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Super admins can see all
CREATE POLICY "user_twofa_admin_all" ON public.user_twofa
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Create user_logs table for audit trail
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Action type (2fa_setup, 2fa_verified, 2fa_backup_used, login, etc.)
  action            TEXT        NOT NULL,
  
  -- Additional details (JSON for flexibility)
  details           JSONB,
  
  -- IP address or session info (if captured)
  session_info      JSONB,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_logs_user_id 
  ON public.user_logs (user_id, created_at DESC);
CREATE INDEX idx_user_logs_action 
  ON public.user_logs (action, created_at DESC);

ALTER TABLE public.user_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own logs
CREATE POLICY "user_logs_own_only" ON public.user_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Super admins can see all
CREATE POLICY "user_logs_admin_all" ON public.user_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Create function to initialize 2FA record for new users
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.initialize_user_twofa()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new user is created in auth.users, create their 2FA record
  INSERT INTO public.user_twofa (user_id, twofa_enabled)
  VALUES (NEW.id, false)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-initialize 2FA for new users
DROP TRIGGER IF EXISTS trg_init_user_twofa ON auth.users;
CREATE TRIGGER trg_init_user_twofa
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_twofa();

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Create function to verify TOTP code against secret
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.verify_totp_code(
  p_user_id UUID,
  p_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  -- This is a placeholder function
  -- In production, call your Supabase Edge Function
  -- For now, we trust the Edge Function to do verification
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Seed initial data (for existing users)
-- ─────────────────────────────────────────────────────────────────────────

-- Initialize 2FA record for all existing users without one
INSERT INTO public.user_twofa (user_id, twofa_enabled)
SELECT id, false
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_twofa)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- =============================================================================
-- Verification Queries
-- =============================================================================
-- After migration, verify:
--
-- SELECT COUNT(*) FROM public.user_twofa;
-- SELECT COUNT(*) FROM public.user_logs;
-- SELECT * FROM public.user_twofa LIMIT 1;
--
-- =============================================================================
