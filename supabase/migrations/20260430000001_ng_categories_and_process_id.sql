-- ============================================================
-- Migration: NG Categories per-product + fix ng_entries process_id
-- ============================================================

-- 1. Add product_id (nullable) to defect_types
--    NULL  = kategori NG global (berlaku semua produk)
--    UUID  = kategori NG khusus produk tertentu
ALTER TABLE public.defect_types
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_defect_types_product
  ON public.defect_types(product_id);

-- 2. Fix ng_entries: gunakan process_id (FK ke processes / POS level)
--    sub_process_id dipertahankan sementara (nullable, tidak ada FK baru)
ALTER TABLE public.ng_entries
  ADD COLUMN IF NOT EXISTS process_id UUID REFERENCES public.processes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ng_entries_process
  ON public.ng_entries(process_id);

-- 3. Backfill: jika ada sub_process_id yang punya FK valid ke processes
--    (migrasi data jika sub_processes.id == processes.id - edge case)
-- (kosongkan saja; kolom baru mulai dari nol)

-- 4. Ensure shift_runs.work_order kolom sudah ada (sudah ada di skema awal)
--    Safety guard agar idempotent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'shift_runs'
      AND column_name  = 'work_order'
  ) THEN
    ALTER TABLE public.shift_runs ADD COLUMN work_order TEXT;
  END IF;
END $$;

-- 5. Index untuk traceability by work_order
CREATE INDEX IF NOT EXISTS idx_shift_runs_work_order
  ON public.shift_runs(work_order)
  WHERE work_order IS NOT NULL;

-- 6. Add category (4M+E) dan description ke downtime_categories
ALTER TABLE public.downtime_categories
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 7. Ensure defect_types.category column exists (sudah ada tapi pastikan)
-- (kolom TEXT sudah ada dari skema awal)

