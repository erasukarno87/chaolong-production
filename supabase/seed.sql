-- =============================================================================
-- seed.sql — Demo Reset Script
-- PT. Chao Long Motor Parts Indonesia — Production Management System
--
-- USAGE:
--   supabase db reset             ← runs migrations + this file automatically
--   psql $DATABASE_URL -f seed.sql  ← standalone reset on any environment
--
-- WHAT THIS DOES:
--   1. Re-inserts all master lookup data (idempotent — ON CONFLICT DO NOTHING)
--   2. Wipes all transactional data (shift_runs and all child tables)
--   3. Creates a realistic demo shift run already in "running" state with:
--        • 6 hours of hourly output records
--        • 4 NG entries across different defect types
--        • 2 downtime entries (1 unplanned breakdown, 1 planned changeover)
--        • check sheet results (5F done, 5L pending, all autonomous checks done)
--   4. Seeds operator skill matrix (deterministic, using hash of name+process)
--
-- NOTES:
--   • Requires pgcrypto extension (already in migrations).
--   • Default operator PIN for all demo operators: 1234
--   • To rotate PINs: UPDATE operators SET pin_hash = crypt('<new_pin>', gen_salt('bf',10))
--     WHERE employee_code = '<code>';
-- =============================================================================

BEGIN;

-- ─── 0. Extension guard ───────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- SECTION 1 — MASTER LOOKUP DATA (idempotent)
-- =============================================================================

-- Lines
INSERT INTO public.lines (code, name, description, active) VALUES
  ('LINE-A', 'LINE A — Commun. Cont. Unit', 'Assembly line untuk MCU CB150 / Vario 160', true),
  ('LINE-B', 'LINE B — ECU Sub-Assembly',   'Sub-assembly dan testing ECU',               true)
ON CONFLICT (code) DO NOTHING;

-- Products
INSERT INTO public.products (code, name, model, description, active) VALUES
  ('MCU-001', 'ECU CB150',     'B6Y-12', 'Engine Control Unit Honda CB150',     true),
  ('ECU-002', 'ECU Vario 160', 'V16-A',  'Engine Control Unit Honda Vario 160', true)
ON CONFLICT (code) DO NOTHING;

-- Processes
INSERT INTO public.processes (code, name, sort_order, active) VALUES
  ('BTBETA',   'BT Burning Beta',   10, true),
  ('BTOFC',    'BT Official',       20, true),
  ('FFIRMARK', 'FFI & R-Mark',      30, true),
  ('RMPASTE',  'R-Mark Paste',      40, true),
  ('FINALFI',  'Final FI',          50, true),
  ('VISPACK',  'Visual & Pack',     60, true),
  ('GLUE',     'Gluing',            70, true),
  ('SOLDER',   'Soldering',         80, true),
  ('MCUFLASH', 'MCU Flash',         90, true),
  ('CONFCOAT', 'Conformal Coat',   100, true)
ON CONFLICT (code) DO NOTHING;

-- Sub-processes
INSERT INTO public.sub_processes (process_id, code, name, sort_order)
SELECT p.id, sp.code, sp.name, sp.sort
FROM public.processes p
JOIN (VALUES
  ('BTBETA',   'BT-1', 'BT Burning Beta',     10),
  ('BTOFC',    'BT-2', 'BT Official',         10),
  ('FFIRMARK', 'FR-1', 'FFI & R-Mark',        10),
  ('RMPASTE',  'RP-1', 'R-Mark Paste',        10),
  ('FINALFI',  'FI-1', 'Final FI',            10),
  ('VISPACK',  'VP-1', 'Visual & Pack',       10),
  ('GLUE',     'GL-1', 'Gluing',              10),
  ('SOLDER',   'SD-1', 'Soldering',           10),
  ('MCUFLASH', 'MF-1', 'MCU Flash',           10),
  ('CONFCOAT', 'CC-1', 'Conformal Coat',      10)
) AS sp(proc_code, code, name, sort) ON sp.proc_code = p.code
ON CONFLICT (process_id, code) DO NOTHING;

-- Shifts
INSERT INTO public.shifts (code, name, start_time, end_time, break_minutes, active) VALUES
  ('S1', 'Shift 1', '07:00', '15:00', 60, true),
  ('S2', 'Shift 2', '15:00', '23:00', 60, true),
  ('S3', 'Shift 3', '23:00', '07:00', 60, true)
ON CONFLICT (code) DO NOTHING;

-- Production targets
INSERT INTO public.production_targets (line_id, product_id, shift_id, target_qty, hourly_target)
SELECT l.id, p.id, s.id, 1200, 150
FROM public.lines l, public.products p, public.shifts s
WHERE l.code = 'LINE-A' AND p.code = 'MCU-001' AND s.code = 'S1'
ON CONFLICT DO NOTHING;

INSERT INTO public.production_targets (line_id, product_id, shift_id, target_qty, hourly_target)
SELECT l.id, p.id, s.id, 1100, 138
FROM public.lines l, public.products p, public.shifts s
WHERE l.code = 'LINE-B' AND p.code = 'ECU-002' AND s.code = 'S1'
ON CONFLICT DO NOTHING;

-- Defect types (NG) — full set seeded via migration 20260430000002
-- Guard: hanya insert jika tabel masih kosong (migration belum jalan)
INSERT INTO public.defect_types (code, name, category, product_id, sort_order, active)
SELECT * FROM (VALUES
  ('NG-001', 'Scratch Surface',            'Visual',      NULL::uuid, 10,  true),
  ('NG-002', 'Label Paste Off / Lepas',    'Visual',      NULL::uuid, 20,  true),
  ('NG-005', 'Contamination / Kotoran',    'Visual',      NULL::uuid, 50,  true),
  ('NG-006', 'Conformal Coat Missing',     'Visual',      NULL::uuid, 60,  true),
  ('NG-007', 'Conformal Coat Blobbing',    'Visual',      NULL::uuid, 70,  true),
  ('NG-008', 'Dimension Out-of-Tolerance', 'Dimensional', NULL::uuid, 110, true),
  ('NG-012', 'BT Burning Beta Fail',       'Functional',  NULL::uuid, 210, true),
  ('NG-014', 'Final FI Fail',              'Functional',  NULL::uuid, 230, true),
  ('NG-015', 'Short Circuit',              'Functional',  NULL::uuid, 240, true),
  ('NG-017', 'Solder Bridge',              'Functional',  NULL::uuid, 260, true),
  ('NG-018', 'Missing Component',          'Functional',  NULL::uuid, 270, true),
  ('NG-020', 'Other / Lainnya',            'Others',      NULL::uuid, 990, true)
) AS v(code, name, category, product_id, sort_order, active)
WHERE NOT EXISTS (SELECT 1 FROM public.defect_types LIMIT 1)
ON CONFLICT (code) DO NOTHING;

-- Downtime categories — full set seeded via migration 20260430000002
-- Guard: hanya insert jika tabel masih kosong
INSERT INTO public.downtime_categories (code, name, category, description, is_planned, sort_order, active)
SELECT * FROM (VALUES
  ('DT-004', 'Machine Breakdown',           'Machine',     'Kerusakan mesin mendadak.',                 false, 110, true),
  ('DT-009', 'Changeover / Ganti Produk',   'Method',      'Setup pergantian produk.',                  true,  210, true),
  ('DT-013', 'Tunggu Material / Part',      'Material',    'Material belum tiba di lini.',              false, 310, true),
  ('DT-010', 'Quality Hold / Stop & Check', 'Method',      'Lini stop untuk inspeksi kualitas.',        false, 220, true),
  ('DT-003', 'Istirahat / Toilet Break',    'Man',         'Break personal operator.',                  true,   30, true),
  ('DT-017', 'Pemadaman Listrik',           'Environment', 'Gangguan pasokan listrik.',                 false, 410, true),
  ('DT-020', 'Gangguan Fasilitas Lainnya',  'Environment', 'Masalah fasilitas lain.',                   false, 440, true)
) AS v(code, name, category, description, is_planned, sort_order, active)
WHERE NOT EXISTS (SELECT 1 FROM public.downtime_categories LIMIT 1)
ON CONFLICT (code) DO NOTHING;

-- Check sheet templates
INSERT INTO public.check_sheet_templates (kind, code, label, sort_order, active) VALUES
  ('5F5L',       '5F',  '5 First — Awal Shift Inspection',   10, true),
  ('5F5L',       '5L',  '5 Last — Akhir Shift Inspection',   20, true),
  ('AUTONOMOUS', 'AM1', 'Mesin First Function',               10, true),
  ('AUTONOMOUS', 'AM2', 'Label Printer',                      20, true),
  ('AUTONOMOUS', 'AM3', 'Mesin Auto Potting',                 30, true),
  ('AUTONOMOUS', 'AM4', 'Mixing PU',                          40, true),
  ('AUTONOMOUS', 'AM5', 'Mesin Final Inspection',             50, true)
ON CONFLICT (kind, code) DO NOTHING;

-- Operators (bcrypt-hashed PIN "1234" — rotate after first login)
INSERT INTO public.operators (full_name, employee_code, role, pin_hash, initials, avatar_color, assigned_line_ids, active)
SELECT
  v.full_name, v.employee_code, v.role::public.app_role,
  crypt('1234', gen_salt('bf', 10)),
  v.initials, v.avatar_color,
  ARRAY(SELECT id FROM public.lines WHERE code = ANY(v.lines))::uuid[],
  true
FROM (VALUES
  ('Budi Santoso',    'EMP-001', 'leader',   'BS', '#1A6EFA', ARRAY['LINE-A']),
  ('Siti Rahayu',     'EMP-002', 'leader',   'SR', '#00B37D', ARRAY['LINE-B']),
  ('Andi Pratama',    'EMP-003', 'operator', 'AP', '#F59E0B', ARRAY['LINE-A']),
  ('Dewi Lestari',    'EMP-004', 'operator', 'DL', '#8B5CF6', ARRAY['LINE-A']),
  ('Rudi Hartono',    'EMP-005', 'operator', 'RH', '#EF4444', ARRAY['LINE-A','LINE-B']),
  ('Maya Putri',      'EMP-006', 'operator', 'MP', '#0EA5E9', ARRAY['LINE-B']),
  ('Fitriani Hanum',  'EMP-007', 'operator', 'FH', '#EC4899', ARRAY['LINE-A']),
  ('Rizky Pratama',   'EMP-008', 'operator', 'RP', '#14B8A6', ARRAY['LINE-A']),
  ('Pak Hendro',      'EMP-009', 'viewer',   'PH', '#6B7280', ARRAY[]::text[])
) AS v(full_name, employee_code, role, initials, avatar_color, lines)
ON CONFLICT (employee_code) DO NOTHING;

-- =============================================================================
-- SECTION 2 — WIPE TRANSACTIONAL DATA
-- (child tables first to respect FK constraints)
-- =============================================================================

DELETE FROM public.eosr_reports;
DELETE FROM public.check_sheet_results;
DELETE FROM public.downtime_entries;
DELETE FROM public.ng_entries;
DELETE FROM public.hourly_outputs;
DELETE FROM public.shift_runs;

-- =============================================================================
-- SECTION 3 — DEMO SHIFT RUN
-- Creates a "running" Shift 1 on LINE-A producing MCU-001 today,
-- with leader = Budi Santoso (EMP-001), started ~07:05 this morning.
-- =============================================================================

DO $$
DECLARE
  v_run_id     UUID;
  v_line_id    UUID;
  v_prod_id    UUID;
  v_shift_id   UUID;
  v_leader_id  UUID;
  v_today      DATE := CURRENT_DATE;
  -- defect type ids (kode baru NG-xxx)
  v_ng_btfail   UUID;
  v_ng_coatmiss UUID;
  v_ng_lbloff   UUID;
  v_ng_scratch  UUID;
  -- downtime category ids (kode baru DT-xxx)
  v_dt_breakdown  UUID;
  v_dt_changeover UUID;
  -- check sheet template ids
  v_5f UUID; v_5l UUID;
  v_am1 UUID; v_am2 UUID; v_am3 UUID; v_am4 UUID; v_am5 UUID;
  -- process ids (FK baru di ng_entries.process_id → processes)
  v_proc_btbeta   UUID;
  v_proc_rmpaste  UUID;
  v_proc_confcoat UUID;
  v_proc_vispack  UUID;
BEGIN
  SELECT id INTO v_line_id   FROM public.lines     WHERE code = 'LINE-A';
  SELECT id INTO v_prod_id   FROM public.products  WHERE code = 'MCU-001';
  SELECT id INTO v_shift_id  FROM public.shifts    WHERE code = 'S1';
  SELECT id INTO v_leader_id FROM public.operators WHERE employee_code = 'EMP-001';

  -- defect types pakai kode baru
  SELECT id INTO v_ng_btfail   FROM public.defect_types WHERE code = 'NG-012';
  SELECT id INTO v_ng_coatmiss FROM public.defect_types WHERE code = 'NG-006';
  SELECT id INTO v_ng_lbloff   FROM public.defect_types WHERE code = 'NG-002';
  SELECT id INTO v_ng_scratch  FROM public.defect_types WHERE code = 'NG-001';

  -- downtime categories pakai kode baru
  SELECT id INTO v_dt_breakdown  FROM public.downtime_categories WHERE code = 'DT-004';
  SELECT id INTO v_dt_changeover FROM public.downtime_categories WHERE code = 'DT-009';

  SELECT id INTO v_5f  FROM public.check_sheet_templates WHERE kind='5F5L'       AND code='5F';
  SELECT id INTO v_5l  FROM public.check_sheet_templates WHERE kind='5F5L'       AND code='5L';
  SELECT id INTO v_am1 FROM public.check_sheet_templates WHERE kind='AUTONOMOUS' AND code='AM1';
  SELECT id INTO v_am2 FROM public.check_sheet_templates WHERE kind='AUTONOMOUS' AND code='AM2';
  SELECT id INTO v_am3 FROM public.check_sheet_templates WHERE kind='AUTONOMOUS' AND code='AM3';
  SELECT id INTO v_am4 FROM public.check_sheet_templates WHERE kind='AUTONOMOUS' AND code='AM4';
  SELECT id INTO v_am5 FROM public.check_sheet_templates WHERE kind='AUTONOMOUS' AND code='AM5';

  -- process ids (FK langsung ke processes, bukan sub_processes)
  SELECT id INTO v_proc_btbeta   FROM public.processes WHERE code = 'BTBETA';
  SELECT id INTO v_proc_rmpaste  FROM public.processes WHERE code = 'RMPASTE';
  SELECT id INTO v_proc_confcoat FROM public.processes WHERE code = 'CONFCOAT';
  SELECT id INTO v_proc_vispack  FROM public.processes WHERE code = 'VISPACK';

  -- ── Create shift run ────────────────────────────────────────────────────────
  INSERT INTO public.shift_runs (
    line_id, product_id, shift_id, leader_operator_id,
    target_qty, hourly_target, status, work_order,
    started_at, notes
  ) VALUES (
    v_line_id, v_prod_id, v_shift_id, v_leader_id,
    1200, 150, 'running', 'WO-2604-001',
    (v_today || ' 07:05:00')::timestamptz,
    'Demo shift run — seeded data. Reset dengan seed.sql.'
  )
  RETURNING id INTO v_run_id;

  -- ── Hourly outputs (8 hours: 07:00–15:00, hour_index 0..7) ──────────────────
  -- Realistic pattern: ramp-up → stable → dip at breakdown → recovery
  INSERT INTO public.hourly_outputs
    (shift_run_id, hour_index, hour_label, actual_qty, ng_qty, downtime_minutes, is_break, note)
  VALUES
    (v_run_id, 0, '07:00–08:00', 134, 2,  0, false, 'Start-up — pemanasan mesin'),
    (v_run_id, 1, '08:00–09:00', 148, 1,  0, false, 'Stabil'),
    (v_run_id, 2, '09:00–10:00',  98, 3, 35, false, 'Breakdown BT Fixture — maintenance dipanggil'),
    (v_run_id, 3, '10:00–11:00', 145, 2,  0, false, 'Recovered setelah repair'),
    (v_run_id, 4, '11:00–12:00', 142, 4,  0, false, 'NG coat naik — QC dipanggil'),
    (v_run_id, 5, '12:00–13:00',   0, 0, 60, true,  'Break makan siang'),
    (v_run_id, 6, '13:00–14:00', 150, 1,  0, false, 'On-target'),
    (v_run_id, 7, '14:00–15:00', 140, 2,  0, false, 'Menjelang akhir shift');

  -- ── NG entries — pakai process_id (FK → processes), bukan sub_process_id ─────
  INSERT INTO public.ng_entries
    (shift_run_id, defect_type_id, process_id, qty, disposition, found_at, description)
  VALUES
    (v_run_id, v_ng_btfail,   v_proc_btbeta,   3, 'rework',   (v_today||' 09:22:00')::timestamptz, 'BT Burning Beta — pin probe rusak, tiga unit fail test'),
    (v_run_id, v_ng_coatmiss, v_proc_confcoat, 5, 'rework',   (v_today||' 11:10:00')::timestamptz, 'Conformal coat blobbing — pengaturan nozzle'),
    (v_run_id, v_ng_lbloff,   v_proc_rmpaste,  3, 'rework',   (v_today||' 13:45:00')::timestamptz, 'Label paste off — roll tape habis, ganti baru'),
    (v_run_id, v_ng_scratch,  v_proc_vispack,  2, 'accepted', (v_today||' 14:30:00')::timestamptz, 'Minor scratch pada housing — masih dalam toleransi kosmetik');

  -- ── Downtime entries ──────────────────────────────────────────────────────────
  INSERT INTO public.downtime_entries
    (shift_run_id, category_id, kind, duration_minutes, started_at, ended_at, root_cause, action_taken)
  VALUES
    (
      v_run_id, v_dt_breakdown, 'unplanned', 35,
      (v_today||' 09:10:00')::timestamptz,
      (v_today||' 09:45:00')::timestamptz,
      'Pin probe BT Burning Beta fixture patah akibat thermal fatigue',
      'Ganti pin probe baru stok maintenance. Preventive PM dijadwalkan minggu depan.'
    ),
    (
      v_run_id, v_dt_changeover, 'planned', 15,
      (v_today||' 13:30:00')::timestamptz,
      (v_today||' 13:45:00')::timestamptz,
      'Pergantian roll label printer — stok cassette habis',
      'Refill cassette label dari warehouse. Koordinasi dengan PPIC untuk min-stock.'
    );

  -- ── Check sheet results ───────────────────────────────────────────────────────
  -- 5F done (awal shift), 5L belum (akhir shift), semua autonomous DONE
  INSERT INTO public.check_sheet_results
    (shift_run_id, template_id, passed, checked_at, note)
  VALUES
    (v_run_id, v_5f,  true,  (v_today||' 07:12:00')::timestamptz, 'Semua item awal shift OK'),
    -- 5L deliberately omitted — simulates "not yet done" at end of shift
    (v_run_id, v_am1, true,  (v_today||' 06:55:00')::timestamptz, NULL),
    (v_run_id, v_am2, true,  (v_today||' 06:58:00')::timestamptz, NULL),
    (v_run_id, v_am3, true,  (v_today||' 07:01:00')::timestamptz, NULL),
    (v_run_id, v_am4, true,  (v_today||' 07:03:00')::timestamptz, NULL),
    (v_run_id, v_am5, true,  (v_today||' 07:05:00')::timestamptz, NULL);

END $$;

-- =============================================================================
-- SECTION 4 — OPERATOR SKILL MATRIX
-- Deterministic: uses hash(full_name || process_code) for level (0–4)
-- and hash(full_name || process_code || 'wi') % 3 != 0 for wi_pass
-- =============================================================================

INSERT INTO public.operator_skills (operator_id, process_id, level, wi_pass)
SELECT
  o.id,
  p.id,
  (abs(hashtext(o.full_name || p.code)) % 5)::int,
  (abs(hashtext(o.full_name || p.code || 'wi')) % 3) != 0
FROM public.operators o
CROSS JOIN public.processes p
WHERE o.active = true
ON CONFLICT (operator_id, process_id)
DO UPDATE SET
  level   = EXCLUDED.level,
  wi_pass = EXCLUDED.wi_pass,
  updated_at = now();

-- =============================================================================
-- DONE
-- =============================================================================
-- Summary of what was seeded:
--   • Lines:             2  (LINE-A, LINE-B)
--   • Products:          2  (MCU-001, ECU-002)
--   • Shifts:            3  (S1/S2/S3)
--   • Processes:        10
--   • Operators:         9  (PIN: 1234 for all)
--   • NG Categories:    20  (NG-001..NG-020 — Visual/Dimensional/Functional/Others)
--   • DT Categories:    20  (DT-001..DT-020 — Man/Machine/Method/Material/Environment)
--   • Demo shift run: LINE-A / MCU-001 / Shift 1 / WO-2604-001 — status "running"
--       - 8 hourly output rows (incl. 1 break hour)
--       - 4 NG entries via process_id (13 units total)
--       - 2 downtime entries (35 mn breakdown + 15 mn changeover = 50 mn)
--       - 6 check sheet results (5F=✓, 5L=pending, AM1-AM5=✓)
-- =============================================================================

COMMIT;
