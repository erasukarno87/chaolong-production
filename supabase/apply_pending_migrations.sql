-- =============================================================================
-- APPLY PENDING MIGRATIONS — jalankan seluruh isi file ini di Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste → Run)
--
-- Semua perintah idempotent — aman dijalankan berulang kali.
-- =============================================================================

-- ─── Migration 008 · Hapus shift_id dari groups ───────────────────────────────

ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_line_id_shift_id_key;
DROP INDEX IF EXISTS public.idx_groups_shift;
ALTER TABLE public.groups DROP COLUMN IF EXISTS shift_id;


-- ─── Migration 009 · Tambah nilai baru ke app_role ENUM ──────────────────────

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';


-- ─── Migration 010 · Migrasi data: operator→supervisor, viewer→manager ────────

UPDATE public.user_roles SET role = 'supervisor' WHERE role = 'operator';
UPDATE public.user_roles SET role = 'manager'    WHERE role = 'viewer';
UPDATE public.operators   SET role = 'supervisor' WHERE role = 'operator';
UPDATE public.operators   SET role = 'manager'    WHERE role = 'viewer';
ALTER TABLE public.operators ALTER COLUMN role SET DEFAULT 'leader';


-- ─── Migration 011 · Leader = Auth User ──────────────────────────────────────

-- group_leaders: operator_id → user_id
ALTER TABLE public.group_leaders DROP CONSTRAINT IF EXISTS group_leaders_group_id_operator_id_key;
ALTER TABLE public.group_leaders DROP COLUMN IF EXISTS operator_id;
DROP INDEX IF EXISTS public.idx_gl_operator;

ALTER TABLE public.group_leaders
  ADD COLUMN IF NOT EXISTS user_id UUID
    REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Isi default untuk baris yang sudah ada (jika ada), lalu hapus NOT NULL default
-- Catatan: jika tabel kosong, langsung tambahkan NOT NULL constraint
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.group_leaders WHERE user_id IS NULL) = 0 THEN
    ALTER TABLE public.group_leaders ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

ALTER TABLE public.group_leaders
  ADD CONSTRAINT IF NOT EXISTS group_leaders_group_id_user_id_key UNIQUE (group_id, user_id);

CREATE INDEX IF NOT EXISTS idx_gl_user ON public.group_leaders (user_id);

-- shift_runs: leader_operator_id → leader_user_id
ALTER TABLE public.shift_runs DROP COLUMN IF EXISTS leader_operator_id;
ALTER TABLE public.shift_runs
  ADD COLUMN IF NOT EXISTS leader_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- operators: hapus user_id
DROP INDEX IF EXISTS public.idx_operators_user_id;
ALTER TABLE public.operators DROP COLUMN IF EXISTS user_id;


-- ─── Migration 012 · Username login untuk non-admin staff ────────────────────

-- Tambah kolom username ke profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Unique index case-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- RPC: ambil email dari username — bisa dipanggil oleh anon (belum login)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM   public.profiles
  WHERE  lower(username) = lower(p_username)
  LIMIT  1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_email_by_username(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;

-- =============================================================================
-- Selesai. Refresh aplikasi setelah menjalankan script ini.
-- =============================================================================
