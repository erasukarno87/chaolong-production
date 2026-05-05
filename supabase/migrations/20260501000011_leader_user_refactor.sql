-- =============================================================================
-- Migration 011 · Leader = Auth User (bukan Operator)
--
-- group_leaders.operator_id  → user_id (references profiles.user_id)
-- shift_runs.leader_operator_id → leader_user_id (references auth.users)
-- operators.user_id          → dihapus (tidak diperlukan)
-- =============================================================================

-- ─── 1. group_leaders: operator_id → user_id ─────────────────────────────────

-- Hapus kolom lama dan constraint
ALTER TABLE public.group_leaders DROP CONSTRAINT IF EXISTS group_leaders_group_id_operator_id_key;
ALTER TABLE public.group_leaders DROP COLUMN IF EXISTS operator_id;
DROP INDEX IF EXISTS public.idx_gl_operator;

-- Tambah user_id (references profiles.user_id agar PostgREST bisa join)
ALTER TABLE public.group_leaders
  ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT gen_random_uuid()
    REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Setelah data kosong (fresh migration), hapus default
ALTER TABLE public.group_leaders ALTER COLUMN user_id DROP DEFAULT;

-- Unique constraint baru
ALTER TABLE public.group_leaders
  ADD CONSTRAINT group_leaders_group_id_user_id_key UNIQUE (group_id, user_id);

-- Index baru
CREATE INDEX IF NOT EXISTS idx_gl_user ON public.group_leaders (user_id);


-- ─── 2. shift_runs: leader_operator_id → leader_user_id ──────────────────────

ALTER TABLE public.shift_runs DROP COLUMN IF EXISTS leader_operator_id;
ALTER TABLE public.shift_runs
  ADD COLUMN IF NOT EXISTS leader_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;


-- ─── 3. operators: hapus user_id (tidak diperlukan) ──────────────────────────

DROP INDEX IF EXISTS public.idx_operators_user_id;
ALTER TABLE public.operators DROP COLUMN IF EXISTS user_id;

-- =============================================================================
-- Done.
-- =============================================================================
