-- =============================================================================
-- Migration 010 · Migrasi data: ganti operator→supervisor, viewer→manager
--
-- Harus dijalankan SETELAH migration 009 sudah ter-commit, karena
-- ALTER TYPE ADD VALUE harus committed sebelum nilai baru bisa digunakan.
-- =============================================================================

-- 1. Migrasi user_roles
UPDATE public.user_roles SET role = 'supervisor' WHERE role = 'operator';
UPDATE public.user_roles SET role = 'manager'    WHERE role = 'viewer';

-- 2. Migrasi operators.role
UPDATE public.operators   SET role = 'supervisor' WHERE role = 'operator';
UPDATE public.operators   SET role = 'manager'    WHERE role = 'viewer';

-- 3. Ubah DEFAULT kolom operators.role
ALTER TABLE public.operators
  ALTER COLUMN role SET DEFAULT 'leader';
