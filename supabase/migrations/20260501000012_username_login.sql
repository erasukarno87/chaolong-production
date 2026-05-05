-- =============================================================================
-- Migration 012 · Username login untuk non-admin staff
-- Tambah kolom username ke profiles + RPC lookup (callable by anon)
-- =============================================================================

-- 1. Tambah kolom username ke profiles (nullable, unique, case-insensitive via lower index)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Unique index case-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- 2. RPC: ambil email berdasarkan username — bisa dipanggil tanpa login (anon)
--    Dipakai Login.tsx saat staff login dengan username
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

-- Izinkan anon (belum login) memanggil fungsi ini
REVOKE EXECUTE ON FUNCTION public.get_email_by_username(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;
