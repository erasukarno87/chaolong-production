-- =============================================================================
-- Migration: Link operators to Supabase auth users
-- Setiap Leader yang punya akun login bisa di-link ke record operators mereka.
-- pin_hash menjadi nullable — leader login via Supabase auth, bukan PIN.
-- =============================================================================

-- 1. Tambah kolom user_id (nullable, unique) ke operators
ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS user_id UUID
    UNIQUE
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- 2. Index untuk lookup by user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_operators_user_id
  ON public.operators (user_id)
  WHERE user_id IS NOT NULL;

-- 4. RLS: izinkan operator/leader baca record mereka sendiri
--    (selain policy select_roster yang sudah ada untuk semua authenticated)
--    Tidak perlu policy baru — policy existing "operators_select_roster" sudah
--    USING (true), jadi semua authenticated bisa SELECT.
--    Untuk WRITE (update user_id): hanya super_admin via policy existing.

-- 5. Recreate operators_public view to include user_id
--    (user_id tidak di-expose ke frontend, hanya digunakan server-side di AuthContext)
--    View TIDAK berubah — user_id cukup di-query langsung dari tabel operators.

-- Done.
