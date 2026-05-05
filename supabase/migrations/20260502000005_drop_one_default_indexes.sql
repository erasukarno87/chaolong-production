-- ============================================================
-- Migration: hapus partial unique index "satu default per operator"
--
-- Latar belakang:
--   Fitur "multi ★ default workstation" membutuhkan lebih dari 1 baris
--   dengan is_default = true per operator.
--   Index ola_one_default_per_op dan opa_one_default_per_op
--   mencegah hal ini → menyebabkan 409 saat INSERT/upsert.
--
-- Constraint yang TETAP dipertahankan:
--   UNIQUE (operator_id, line_id)    — tidak boleh duplikat kombinasi
--   UNIQUE (operator_id, process_id) — tidak boleh duplikat kombinasi
-- ============================================================

DROP INDEX IF EXISTS public.ola_one_default_per_op;
DROP INDEX IF EXISTS public.opa_one_default_per_op;
