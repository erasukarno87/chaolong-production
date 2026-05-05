-- =============================================================================
-- Migration: Lepas shift_id dari tabel groups
--
-- Perubahan bisnis: setiap Group dapat bekerja di Shift mana saja (rotasi
-- mingguan). Shift dipilih secara eksplisit oleh Leader saat membuka Shift Run,
-- bukan dihardcode ke Group. Dengan demikian:
--   - Kolom shift_id dihapus dari groups
--   - UNIQUE constraint (line_id, shift_id) di-drop
--   - INDEX idx_groups_shift di-drop
-- =============================================================================

-- 1. Hapus UNIQUE constraint (line_id, shift_id)
--    Nama constraint di migration sebelumnya adalah groups_line_id_shift_id_key
ALTER TABLE public.groups
  DROP CONSTRAINT IF EXISTS groups_line_id_shift_id_key;

-- 2. Hapus index yang mengacu ke shift_id
DROP INDEX IF EXISTS public.idx_groups_shift;

-- 3. Hapus kolom shift_id
ALTER TABLE public.groups
  DROP COLUMN IF EXISTS shift_id;
