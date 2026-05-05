-- ============================================================
-- Migration: Seed master data — NG Categories & Downtime Categories
-- NG  : code auto DT-xxx, category = Visual/Dimensional/Functional/Others
-- DT  : code auto DT-xxx, category = Man/Machine/Method/Material/Environment
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. DEFECT TYPES (NG) — global (product_id = NULL)
--    ON CONFLICT (code) DO UPDATE supaya idempotent
-- ─────────────────────────────────────────────────────────────

-- Hapus seed lama yang pakai kategori format lama (Electrical, Solder, dll.)
-- agar tidak bentrok; gunakan DO UPDATE biar aman di re-run

INSERT INTO public.defect_types
  (code, name, category, product_id, sort_order, active)
VALUES
  -- ── Visual ────────────────────────────────────────────────
  ('NG-001', 'Scratch Surface',          'Visual',      NULL, 10,  true),
  ('NG-002', 'Label Paste Off / Lepas',  'Visual',      NULL, 20,  true),
  ('NG-003', 'Color Defect / Pudar',     'Visual',      NULL, 30,  true),
  ('NG-004', 'Missing Marking / Kode',   'Visual',      NULL, 40,  true),
  ('NG-005', 'Contamination / Kotoran',  'Visual',      NULL, 50,  true),
  ('NG-006', 'Conformal Coat Missing',   'Visual',      NULL, 60,  true),
  ('NG-007', 'Conformal Coat Blobbing',  'Visual',      NULL, 70,  true),
  -- ── Dimensional ───────────────────────────────────────────
  ('NG-008', 'Dimension Out-of-Tolerance','Dimensional', NULL, 110, true),
  ('NG-009', 'Warpage / Deformasi',      'Dimensional', NULL, 120, true),
  ('NG-010', 'Wrong Position / Misalign','Dimensional', NULL, 130, true),
  ('NG-011', 'Gap / Clearance OOT',      'Dimensional', NULL, 140, true),
  -- ── Functional ────────────────────────────────────────────
  ('NG-012', 'BT Burning Beta Fail',     'Functional',  NULL, 210, true),
  ('NG-013', 'BT Official Fail',         'Functional',  NULL, 220, true),
  ('NG-014', 'Final FI Fail',            'Functional',  NULL, 230, true),
  ('NG-015', 'Short Circuit',            'Functional',  NULL, 240, true),
  ('NG-016', 'Open Circuit',             'Functional',  NULL, 250, true),
  ('NG-017', 'Solder Bridge',            'Functional',  NULL, 260, true),
  ('NG-018', 'Missing Component',        'Functional',  NULL, 270, true),
  ('NG-019', 'Wrong Component',          'Functional',  NULL, 280, true),
  -- ── Others ────────────────────────────────────────────────
  ('NG-020', 'Other / Lainnya',          'Others',      NULL, 990, true)
ON CONFLICT (code) DO UPDATE SET
  name       = EXCLUDED.name,
  category   = EXCLUDED.category,
  product_id = EXCLUDED.product_id,
  sort_order = EXCLUDED.sort_order,
  active     = EXCLUDED.active;

-- Hapus kode lama dari seed pertama agar tidak ganda
DELETE FROM public.defect_types
WHERE code IN ('SHORT','SOLDBR','SCRATCH','LBLOFF','COATMISS','BTFAIL','FIFAIL','DIMOOT','MISSCOMP','OTHER')
  -- hanya hapus jika belum ada di ng_entries (FK safety)
  AND id NOT IN (SELECT DISTINCT defect_type_id FROM public.ng_entries WHERE defect_type_id IS NOT NULL);


-- ─────────────────────────────────────────────────────────────
-- 2. DOWNTIME CATEGORIES — global (berlaku semua Line)
--    category = Man | Machine | Method | Material | Environment
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.downtime_categories
  (code, name, category, description, is_planned, sort_order, active)
VALUES
  -- ── Man ───────────────────────────────────────────────────
  ('DT-001', 'Operator Absen / Kurang',      'Man',         'Jumlah operator tidak sesuai plan; perlu pengganti atau penyesuaian lini.',         false, 10,  true),
  ('DT-002', 'Operator Training / OJT',      'Man',         'Waktu henti untuk pelatihan, OJT, atau sertifikasi operator di lini.',              true,  20,  true),
  ('DT-003', 'Istirahat / Toilet Break',     'Man',         'Break personal operator di luar jadwal istirahat resmi.',                           true,  30,  true),
  -- ── Machine ───────────────────────────────────────────────
  ('DT-004', 'Machine Breakdown',            'Machine',     'Kerusakan mesin mendadak yang menyebabkan lini berhenti. Panggil maintenance.',      false, 110, true),
  ('DT-005', 'Fixture / Jig / Tool Rusak',   'Machine',     'Fixture, jig, atau perkakas rusak/aus sehingga proses tidak dapat berjalan.',       false, 120, true),
  ('DT-006', 'Preventive Maintenance (PM)',  'Machine',     'Perawatan berkala terjadwal — lini berhenti sesuai jadwal PM.',                     true,  130, true),
  ('DT-007', 'Setup / Adjustment Mesin',     'Machine',     'Penyetelan parameter mesin (suhu, tekanan, kecepatan) di luar changeover produk.',   true,  140, true),
  ('DT-008', 'Kalibrasi Alat / Gauge',       'Machine',     'Kalibrasi atau verifikasi alat ukur, gauge, atau sensor.',                          true,  150, true),
  -- ── Method ────────────────────────────────────────────────
  ('DT-009', 'Changeover / Ganti Produk',    'Method',      'Setup pergantian produk: ganti jig, program, parameter, dan verifikasi 1st article.', true, 210, true),
  ('DT-010', 'Quality Hold / Stop & Check',  'Method',      'Lini dihentikan untuk inspeksi kualitas massal akibat temuan NG di lini.',           false, 220, true),
  ('DT-011', 'Engineering Change (ECN)',      'Method',      'Perubahan desain atau proses dari Engineering — lini stop selama implementasi.',     false, 230, true),
  ('DT-012', 'Tunggu Instruksi / WO',        'Method',      'Operator menunggu instruksi kerja, Work Order, atau konfirmasi dari PPIC/Leader.',   false, 240, true),
  -- ── Material ──────────────────────────────────────────────
  ('DT-013', 'Tunggu Material / Part',       'Material',    'Material atau komponen belum tiba di lini; menunggu pengiriman dari warehouse.',      false, 310, true),
  ('DT-014', 'Material Defect / Reject',     'Material',    'Material incoming rejected oleh QC; proses berhenti menunggu material pengganti.',   false, 320, true),
  ('DT-015', 'Salah Material / Wrong Part',  'Material',    'Material atau part yang diterima tidak sesuai spesifikasi atau part number.',        false, 330, true),
  ('DT-016', 'Stok Material Habis',          'Material',    'Buffer stok material di lini habis sebelum resupply tiba.',                          false, 340, true),
  -- ── Environment ───────────────────────────────────────────
  ('DT-017', 'Pemadaman Listrik (PLN/Genset)','Environment', 'Gangguan pasokan listrik dari PLN atau kegagalan genset backup.',                   false, 410, true),
  ('DT-018', 'Gangguan Udara / Kompresor',   'Environment', 'Tekanan angin kompresor turun atau compressor breakdown.',                           false, 420, true),
  ('DT-019', 'Suhu Ruangan Ekstrem',         'Environment', 'Suhu lingkungan di luar batas toleransi produksi (terlalu panas/dingin).',           false, 430, true),
  ('DT-020', 'Gangguan Fasilitas Lainnya',   'Environment', 'Masalah fasilitas lain: kebocoran atap, kebakaran kecil, evakuasi, dll.',            false, 440, true)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  category    = EXCLUDED.category,
  description = EXCLUDED.description,
  is_planned  = EXCLUDED.is_planned,
  sort_order  = EXCLUDED.sort_order,
  active      = EXCLUDED.active;

-- Hapus kode lama dari seed pertama agar tidak ganda
DELETE FROM public.downtime_categories
WHERE code IN ('BREAKDOWN','WAITMAT','CHANGEOVER','QHOLD','UTIL','OTHER_DT')
  -- hanya hapus jika belum dipakai di downtime_entries (FK safety)
  AND id NOT IN (SELECT DISTINCT category_id FROM public.downtime_entries WHERE category_id IS NOT NULL);

-- ─────────────────────────────────────────────────────────────
-- Done
-- ─────────────────────────────────────────────────────────────
-- Summary:
--   NG Categories  : 20 entries (NG-001..NG-020) — Visual(7), Dimensional(4), Functional(8), Others(1)
--   DT Categories  : 20 entries (DT-001..DT-020) — Man(3), Machine(5), Method(4), Material(4), Environment(4)
-- ─────────────────────────────────────────────────────────────

COMMIT;
