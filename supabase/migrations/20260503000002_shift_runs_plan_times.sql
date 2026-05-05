-- Migration: tambah plan_start_at dan plan_finish_at ke tabel shift_runs
-- Untuk menyimpan rencana waktu mulai dan selesai produksi per shift run

ALTER TABLE public.shift_runs
  ADD COLUMN IF NOT EXISTS plan_start_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_finish_at TIMESTAMPTZ;

COMMENT ON COLUMN public.shift_runs.plan_start_at  IS 'Rencana jam mulai produksi (diisi saat setup shift)';
COMMENT ON COLUMN public.shift_runs.plan_finish_at IS 'Rencana jam selesai produksi (diisi saat setup shift)';
