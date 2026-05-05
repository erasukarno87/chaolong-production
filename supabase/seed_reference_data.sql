-- =============================================================================
-- Seed: Data Referensi Default (ref_* tables)
-- Jalankan SETELAH migration 20260430000005_reference_lookup_tables.sql
-- Aman dijalankan ulang (ON CONFLICT DO NOTHING)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Kategori Produk
-- ---------------------------------------------------------------------------
INSERT INTO public.ref_product_categories (name, sort_order, active) VALUES
  ('CCU',                     10,  true),
  ('Fuel Sender',             20,  true),
  ('Speedometer Digital',     30,  true),
  ('Speedometer Mechanical',  40,  true),
  ('Winker Lamp',             50,  true),
  ('ECU',                     60,  true),
  ('CDI',                     70,  true),
  ('Regulator',               80,  true),
  ('Sensor',                  90,  true),
  ('Others',                  100, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Klasifikasi NG
-- ---------------------------------------------------------------------------
INSERT INTO public.ref_ng_classes (name, sort_order, active) VALUES
  ('Visual',      10, true),
  ('Dimensional', 20, true),
  ('Functional',  30, true),
  ('Assembly',    40, true),
  ('Electrical',  50, true),
  ('Others',      60, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Klasifikasi Downtime (5M+E)
-- ---------------------------------------------------------------------------
INSERT INTO public.ref_downtime_classes (name, sort_order, active) VALUES
  ('Man',         10, true),
  ('Machine',     20, true),
  ('Method',      30, true),
  ('Material',    40, true),
  ('Environment', 50, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Kategori Item Check Autonomous
-- ---------------------------------------------------------------------------
INSERT INTO public.ref_autonomous_categories (name, sort_order, active) VALUES
  ('Kebersihan',          10, true),
  ('Pelumasan',           20, true),
  ('Inspeksi',            30, true),
  ('Pengencangan',        40, true),
  ('K3',                  50, true),
  ('Pengecekan Visual',   60, true),
  ('Pengecekan Fungsi',   70, true),
  ('Pengukuran',          80, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Frekuensi Check Autonomous
-- ---------------------------------------------------------------------------
INSERT INTO public.ref_autonomous_frequencies (name, sort_order, active) VALUES
  ('Setiap Shift', 10, true),
  ('Harian',       20, true),
  ('Mingguan',     30, true),
  ('Bulanan',      40, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
