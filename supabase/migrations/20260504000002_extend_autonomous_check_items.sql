-- =============================================================================
-- Migration: extend_autonomous_check_items
-- Menambahkan kolom penting untuk traceability dan compliance tracking
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tambah kolom is_critical, item_type, target_value, dll
-- ---------------------------------------------------------------------------
ALTER TABLE public.autonomous_check_items
  ADD COLUMN IF NOT EXISTS is_critical         BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS item_type           TEXT        NOT NULL DEFAULT 'pass_fail'
                                            CHECK (item_type IN ('pass_fail', 'measurement', 'photo', 'yes_no')),
  ADD COLUMN IF NOT EXISTS target_value        TEXT,
  ADD COLUMN IF NOT EXISTS tolerance           TEXT,
  ADD COLUMN IF NOT EXISTS measurement_unit    TEXT,
  ADD COLUMN IF NOT EXISTS reference_media_url TEXT,
  ADD COLUMN IF NOT EXISTS max_time_seconds    INT         NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS requires_approval   BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alert_on_fail       BOOLEAN     NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 2. Tambah kolom process_id untuk tracking workstation
-- ---------------------------------------------------------------------------
ALTER TABLE public.autonomous_check_items
  ADD COLUMN IF NOT EXISTS process_id UUID REFERENCES public.processes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_autonomous_check_items_process
  ON public.autonomous_check_items (process_id);

-- ---------------------------------------------------------------------------
-- 3. Seed data untuk sample autonomous check items dengan kategori lengkap
-- ---------------------------------------------------------------------------
-- CCU LINE-A sample items
INSERT INTO public.autonomous_check_items 
  (line_id, code, name, category, frequency, standard, method, is_critical, item_type, max_time_seconds, sort_order)
SELECT 
  l.id, 'AM1-01', 'Cek Kondisi Fisik Mesin', 'Inspeksi', 'Setiap Shift',
  'Mesin dalam kondisi normal, tidak ada kebisingan abnormal',
  'Dengarkan suara mesin dan lihat kondisi fisik', true, 'yes_no', 30, 1
FROM public.lines l WHERE l.code = 'LINE-A'
ON CONFLICT (line_id, code) DO NOTHING;

INSERT INTO public.autonomous_check_items 
  (line_id, code, name, category, frequency, standard, method, is_critical, item_type, max_time_seconds, sort_order)
SELECT 
  l.id, 'AM1-02', 'Cek Kebersihan Area Kerja', 'Kebersihan', 'Setiap Shift',
  'Area kerja bersih, tidak ada kotoran/sisa material',
  'Visual inspection area kerja dan mesin', false, 'yes_no', 20, 2
FROM public.lines l WHERE l.code = 'LINE-A'
ON CONFLICT (line_id, code) DO NOTHING;

INSERT INTO public.autonomous_check_items 
  (line_id, code, name, category, frequency, standard, method, is_critical, item_type, max_time_seconds, sort_order)
SELECT 
  l.id, 'AM1-03', 'Cek Oli Mesin', 'Pelumasan', 'Setiap Shift',
  'Level oli antara MIN dan MAX',
  'Cek dipstick oli mesin', true, 'measurement', 30, 3
FROM public.lines l WHERE l.code = 'LINE-A'
ON CONFLICT (line_id, code) DO NOTHING;

INSERT INTO public.autonomous_check_items 
  (line_id, code, name, category, frequency, standard, method, is_critical, item_type, max_time_seconds, sort_order)
SELECT 
  l.id, 'AM1-04', 'Cek Kelistrikan', 'Inspeksi', 'Setiap Shift',
  'Kabel tidak terkelupas, terminal aman',
  'Visual inspection kabel dan terminal', true, 'pass_fail', 20, 4
FROM public.lines l WHERE l.code = 'LINE-A'
ON CONFLICT (line_id, code) DO NOTHING;

INSERT INTO public.autonomous_check_items 
  (line_id, code, name, category, frequency, standard, method, is_critical, item_type, max_time_seconds, sort_order)
SELECT 
  l.id, 'AM1-05', 'Cek APAR', 'K3', 'Setiap Shift',
  'APAR tersedia dan belum expired',
  'Cek keberadaan dan label expired APAR', true, 'pass_fail', 15, 5
FROM public.lines l WHERE l.code = 'LINE-A'
ON CONFLICT (line_id, code) DO NOTHING;

INSERT INTO public.autonomous_check_items 
  (line_id, code, name, category, frequency, standard, method, is_critical, item_type, target_value, tolerance, measurement_unit, max_time_seconds, sort_order)
SELECT 
  l.id, 'AM1-06', 'Cek Suhu Ruang Produksi', 'Inspeksi', 'Setiap Shift',
  'Suhu ruang produksi 25-30°C', 'Ukur suhu ruangan', false, 'measurement',
  '27.5', '±3', '°C', 20, 6
FROM public.lines l WHERE l.code = 'LINE-A'
ON CONFLICT (line_id, code) DO NOTHING;

INSERT INTO public.autonomous_check_items 
  (line_id, code, name, category, frequency, standard, method, is_critical, item_type, max_time_seconds, sort_order)
SELECT 
  l.id, 'AM1-07', 'Cek Kelistrikan Panel', 'Inspeksi', 'Setiap Shift',
  'Tidak ada tanda kebakaran, indicator normal',
  'Visual inspection panel kontrol', true, 'pass_fail', 20, 7
FROM public.lines l WHERE l.code = 'LINE-A'
ON CONFLICT (line_id, code) DO NOTHING;

INSERT INTO public.autonomous_check_items 
  (line_id, code, name, category, frequency, standard, method, is_critical, item_type, max_time_seconds, sort_order)
SELECT 
  l.id, 'AM1-08', 'CekTooling Kondisi', 'Inspeksi', 'Setiap Shift',
  'Tooling terpasang dengan benar, tidak ada kerusakan',
  'Visual dan tactile inspection tooling', true, 'pass_fail', 25, 8
FROM public.lines l WHERE l.code = 'LINE-A'
ON CONFLICT (line_id, code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
COMMIT;