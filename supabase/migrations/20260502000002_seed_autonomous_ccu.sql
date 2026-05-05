-- ============================================================
-- SEEDER: Autonomous Check Items — CCU Line
-- Source : Checksheet_AM_CCU_Communication_Control_Unit.csv
-- Lines  : SA-CCU-A (48 items) + FA-CCU-A (73 items) = 121 items
--
-- Jalankan di Supabase SQL Editor.
-- Toleran terhadap line/process yang belum ada di DB:
--   · Jika line tidak ditemukan → item untuk line tersebut dilewati
--   · Jika process (workstation) tidak ditemukan → process_id = NULL
-- ============================================================

DO $$
DECLARE
  -- Line IDs
  v_sa UUID;   -- SA-CCU-A  (LINE SUB ASSY CCU)
  v_fa UUID;   -- FA-CCU-A  (LINE FINAL ASSY CCU)

  -- Workstation IDs — SA-CCU-A
  v_gluing      UUID;   -- Gluing PCBA
  v_soldering   UUID;   -- Soldering Connector
  v_flashing    UUID;   -- Flashing MCU
  v_current     UUID;   -- Current Test
  v_coating_sa  UUID;   -- Coating PCBA (SA)

  -- Workstation IDs — FA-CCU-A
  v_coating_fa  UUID;   -- Coating PCBA (FA)
  v_bt_beta     UUID;   -- BT Burning Beta
  v_bt_official UUID;   -- BT Burning Official
  v_ffi         UUID;   -- First Function Inspection
  v_print_label UUID;   -- Print & Attach Label QR
  v_potting     UUID;   -- Potting PU
  v_curing      UUID;   -- Curing PU 12 Hours
  v_final_fi    UUID;   -- Final Function Inspection
  v_visual_pack UUID;   -- Visual Inspection & Packing

BEGIN
  -- ── 1. Ambil Line ID ────────────────────────────────────────────────────
  SELECT id INTO v_sa FROM lines WHERE code = 'SA-CCU-A' LIMIT 1;
  SELECT id INTO v_fa FROM lines WHERE code = 'FA-CCU-A' LIMIT 1;

  IF v_sa IS NULL THEN
    RAISE NOTICE 'PERINGATAN: Line SA-CCU-A tidak ditemukan — item SA akan dilewati.';
  END IF;
  IF v_fa IS NULL THEN
    RAISE NOTICE 'PERINGATAN: Line FA-CCU-A tidak ditemukan — item FA akan dilewati.';
  END IF;

  -- ── 2. Ambil Process (Workstation) ID — SA-CCU-A ──────────────────────
  IF v_sa IS NOT NULL THEN
    SELECT id INTO v_gluing     FROM processes WHERE line_id = v_sa AND name ILIKE 'Gluing PCBA'          LIMIT 1;
    SELECT id INTO v_soldering  FROM processes WHERE line_id = v_sa AND name ILIKE 'Soldering Connector'  LIMIT 1;
    SELECT id INTO v_flashing   FROM processes WHERE line_id = v_sa AND name ILIKE 'Flashing MCU'         LIMIT 1;
    SELECT id INTO v_current    FROM processes WHERE line_id = v_sa AND name ILIKE 'Current Test'         LIMIT 1;
    SELECT id INTO v_coating_sa FROM processes WHERE line_id = v_sa AND name ILIKE 'Coating PCBA'         LIMIT 1;
  END IF;

  -- ── 3. Ambil Process ID — FA-CCU-A ────────────────────────────────────
  IF v_fa IS NOT NULL THEN
    SELECT id INTO v_coating_fa  FROM processes WHERE line_id = v_fa AND name ILIKE 'Coating PCBA'               LIMIT 1;
    SELECT id INTO v_bt_beta     FROM processes WHERE line_id = v_fa AND name ILIKE 'BT Burning Beta'            LIMIT 1;
    SELECT id INTO v_bt_official FROM processes WHERE line_id = v_fa AND name ILIKE 'BT Burning Official'        LIMIT 1;
    SELECT id INTO v_ffi         FROM processes WHERE line_id = v_fa AND name ILIKE 'First Function Inspection'  LIMIT 1;
    SELECT id INTO v_print_label FROM processes WHERE line_id = v_fa AND name ILIKE 'Print%Label QR'             LIMIT 1;
    SELECT id INTO v_potting     FROM processes WHERE line_id = v_fa AND name ILIKE 'Potting PU'                 LIMIT 1;
    SELECT id INTO v_curing      FROM processes WHERE line_id = v_fa AND name ILIKE 'Curing PU%'                 LIMIT 1;
    SELECT id INTO v_final_fi    FROM processes WHERE line_id = v_fa AND name ILIKE 'Final Function%'            LIMIT 1;
    SELECT id INTO v_visual_pack FROM processes WHERE line_id = v_fa AND name ILIKE 'Visual Inspection%'         LIMIT 1;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════
  -- LINE: SA-CCU-A  (48 items)
  -- ═══════════════════════════════════════════════════════════════════════
  IF v_sa IS NOT NULL THEN

    -- ── Gluing PCBA (11 items: AM-SA-CCU-001 – 011) ─────────────────────
    INSERT INTO autonomous_check_items
      (line_id, process_id, code, name, standard, frequency, method, category, sort_order, active)
    VALUES
      (v_sa, v_gluing, 'AM-SA-CCU-001', 'Air Blow Ionizer',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 10, true),
      (v_sa, v_gluing, 'AM-SA-CCU-002', 'Meja Kerja (Workbench)',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 20, true),
      (v_sa, v_gluing, 'AM-SA-CCU-003', 'ESD Tray',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 30, true),
      (v_sa, v_gluing, 'AM-SA-CCU-004', 'Air Blow Ionizer — Fungsi',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 40, true),
      (v_sa, v_gluing, 'AM-SA-CCU-005', 'Tampilan Work Instruction (WI.P-ENG-A1-D52-01-00)',
        'Menampilkan Work Instruction terbaru', 'Harian', 'Pengecekan Visual', 'Inspeksi', 50, true),
      (v_sa, v_gluing, 'AM-SA-CCU-006', 'Detail Part sesuai Work Instruction',
        'Tidak ada salah part', 'Harian', 'Pengecekan Visual', 'Inspeksi', 60, true),
      (v_sa, v_gluing, 'AM-SA-CCU-007', 'Kondisi Part & Packing PCBA dari Stores',
        'Tidak ada packing rusak, komponen rusak, bengkok, atau patah', 'Harian', 'Pengecekan Visual', 'Inspeksi', 70, true),
      (v_sa, v_gluing, 'AM-SA-CCU-008', 'Komponen Besar (Semua Kapasitor) sesuai Posisi Pin',
        'Jumlah tidak kurang & tidak lebih', 'Harian', 'Pengecekan Visual', 'Inspeksi', 80, true),
      (v_sa, v_gluing, 'AM-SA-CCU-009', 'Proses Gluing — Tipe Lem',
        'Tipe lem: Cemedine', 'Harian', 'Pengecekan Visual', 'Inspeksi', 90, true),
      (v_sa, v_gluing, 'AM-SA-CCU-010', 'Proses Gluing — Tanggal Kadaluarsa',
        'Tanggal kadaluarsa: Tidak melewati masa pakai', 'Harian', 'Pengecekan Visual', 'Inspeksi', 100, true),
      (v_sa, v_gluing, 'AM-SA-CCU-011', 'ESD PPE (APD ESD)',
        'Dipakai dengan benar, Wrist Strap berfungsi', 'Harian', 'Pengecekan Visual', 'K3', 110, true)
    ON CONFLICT (line_id, code) DO UPDATE SET
      process_id = EXCLUDED.process_id, name = EXCLUDED.name, standard = EXCLUDED.standard,
      frequency = EXCLUDED.frequency, method = EXCLUDED.method, category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order, active = EXCLUDED.active;

    -- ── Soldering Connector (9 items: AM-SA-CCU-012 – 020) ──────────────
    INSERT INTO autonomous_check_items
      (line_id, process_id, code, name, standard, frequency, method, category, sort_order, active)
    VALUES
      (v_sa, v_soldering, 'AM-SA-CCU-012', 'Air Blow Ionizer',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 10, true),
      (v_sa, v_soldering, 'AM-SA-CCU-013', 'Meja Kerja (Workbench)',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 20, true),
      (v_sa, v_soldering, 'AM-SA-CCU-014', 'Soldering Jig',
        'Bersih, bebas serpihan logam', 'Harian', 'Pengecekan Visual', 'Kebersihan', 30, true),
      (v_sa, v_soldering, 'AM-SA-CCU-015', 'Air Blow Ionizer — Fungsi',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 40, true),
      (v_sa, v_soldering, 'AM-SA-CCU-016', 'Tombol Power',
        'Berfungsi normal', 'Harian', 'Pengecekan Manual', 'Pengecekan Fungsi', 50, true),
      (v_sa, v_soldering, 'AM-SA-CCU-017', 'Temperature Solder',
        '370 ± 20 °C', 'Harian', 'Pengecekan Manual', 'Pengukuran', 60, true),
      (v_sa, v_soldering, 'AM-SA-CCU-018', 'Mata Solder (Soldering Tip)',
        'Tidak keropos / tidak berlubang', 'Harian', 'Pengecekan Visual', 'Pengecekan Visual', 70, true),
      (v_sa, v_soldering, 'AM-SA-CCU-019', 'Exhaust Fan',
        'Berfungsi normal', 'Harian', 'Pengecekan Manual', 'K3', 80, true),
      (v_sa, v_soldering, 'AM-SA-CCU-020', 'ESD PPE (APD ESD)',
        'Dipakai dengan benar, Wrist Strap berfungsi', 'Harian', 'Pengecekan Visual', 'K3', 90, true)
    ON CONFLICT (line_id, code) DO UPDATE SET
      process_id = EXCLUDED.process_id, name = EXCLUDED.name, standard = EXCLUDED.standard,
      frequency = EXCLUDED.frequency, method = EXCLUDED.method, category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order, active = EXCLUDED.active;

    -- ── Flashing MCU (10 items: AM-SA-CCU-021 – 030) ────────────────────
    INSERT INTO autonomous_check_items
      (line_id, process_id, code, name, standard, frequency, method, category, sort_order, active)
    VALUES
      (v_sa, v_flashing, 'AM-SA-CCU-021', 'Meja Kerja (Workbench)',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 10, true),
      (v_sa, v_flashing, 'AM-SA-CCU-022', 'Body Mesin',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 20, true),
      (v_sa, v_flashing, 'AM-SA-CCU-023', 'Test Needle / Pin Probe — Kebersihan (1)',
        'Bersih, bebas debu', 'Harian', 'Pembersihan dengan ESD Brush', 'Kebersihan', 30, true),
      (v_sa, v_flashing, 'AM-SA-CCU-024', 'Test Needle / Pin Probe — Kebersihan (2)',
        'Bersih, bebas debu', 'Harian', 'Pembersihan dengan ESD Brush', 'Kebersihan', 40, true),
      (v_sa, v_flashing, 'AM-SA-CCU-025', 'Kondisi Jig',
        'Tidak kendor, part tidak rusak', 'Harian', 'Pengecekan Visual', 'Pengencangan', 50, true),
      (v_sa, v_flashing, 'AM-SA-CCU-026', 'Tombol Power ON/OFF',
        'Berfungsi normal', 'Harian', 'Pengecekan Manual', 'Pengecekan Fungsi', 60, true),
      (v_sa, v_flashing, 'AM-SA-CCU-027', 'Tombol PROG',
        'Berfungsi normal', 'Harian', 'Pengecekan Manual', 'Pengecekan Fungsi', 70, true),
      (v_sa, v_flashing, 'AM-SA-CCU-028', 'Test Needle / Pin Probe — Kondisi Visual',
        'Kondisi visual normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Visual', 80, true),
      (v_sa, v_flashing, 'AM-SA-CCU-029', 'Mur pada Jig (Tidak Kendor)',
        'Mur tidak kendor (marking pada mur harus lurus)', 'Harian', 'Pengecekan Visual', 'Pengencangan', 90, true),
      (v_sa, v_flashing, 'AM-SA-CCU-030', 'ESD PPE (APD ESD)',
        'Dipakai dengan benar', 'Harian', 'Pengecekan Visual', 'K3', 100, true)
    ON CONFLICT (line_id, code) DO UPDATE SET
      process_id = EXCLUDED.process_id, name = EXCLUDED.name, standard = EXCLUDED.standard,
      frequency = EXCLUDED.frequency, method = EXCLUDED.method, category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order, active = EXCLUDED.active;

    -- ── Current Test (9 items: AM-SA-CCU-031 – 039) ──────────────────────
    INSERT INTO autonomous_check_items
      (line_id, process_id, code, name, standard, frequency, method, category, sort_order, active)
    VALUES
      (v_sa, v_current, 'AM-SA-CCU-031', 'Air Blow Ionizer',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 10, true),
      (v_sa, v_current, 'AM-SA-CCU-032', 'Body Mesin',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 20, true),
      (v_sa, v_current, 'AM-SA-CCU-033', 'Test Needle / Pin Probe',
        'Bersih, bebas debu', 'Harian', 'Pembersihan dengan ESD Brush', 'Kebersihan', 30, true),
      (v_sa, v_current, 'AM-SA-CCU-034', 'Air Blow Ionizer — Fungsi',
        'Berfungsi normal', 'Harian', 'Pengecekan Manual', 'Pengecekan Fungsi', 40, true),
      (v_sa, v_current, 'AM-SA-CCU-035', 'Tombol Power',
        'Berfungsi normal', 'Harian', 'Pengecekan Manual', 'Pengecekan Fungsi', 50, true),
      (v_sa, v_current, 'AM-SA-CCU-036', 'Tombol Start',
        'Berfungsi normal', 'Harian', 'Pengecekan Manual', 'Pengecekan Fungsi', 60, true),
      (v_sa, v_current, 'AM-SA-CCU-037', 'Dummy Sample Check',
        'Hasil NG: arus < 28 mA', 'Harian', 'Pengecekan Display & Visual', 'Pengukuran', 70, true),
      (v_sa, v_current, 'AM-SA-CCU-038', 'Marker Pen',
        'Tidak habis / tidak kering', 'Harian', 'Pengecekan Manual', 'Pengecekan Visual', 80, true),
      (v_sa, v_current, 'AM-SA-CCU-039', 'ESD PPE (APD ESD)',
        'Dipakai dengan benar, Wrist Strap berfungsi', 'Harian', 'Pengecekan Visual', 'K3', 90, true)
    ON CONFLICT (line_id, code) DO UPDATE SET
      process_id = EXCLUDED.process_id, name = EXCLUDED.name, standard = EXCLUDED.standard,
      frequency = EXCLUDED.frequency, method = EXCLUDED.method, category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order, active = EXCLUDED.active;

    -- ── Coating PCBA — SA (9 items: AM-SA-CCU-040 – 048) ────────────────
    INSERT INTO autonomous_check_items
      (line_id, process_id, code, name, standard, frequency, method, category, sort_order, active)
    VALUES
      (v_sa, v_coating_sa, 'AM-SA-CCU-040', 'Air Blow Ionizer',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 10, true),
      (v_sa, v_coating_sa, 'AM-SA-CCU-041', 'Meja Kerja (Workbench)',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 20, true),
      (v_sa, v_coating_sa, 'AM-SA-CCU-042', 'Air Blow Ionizer — Fungsi',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 30, true),
      (v_sa, v_coating_sa, 'AM-SA-CCU-043', 'Sikat (Brush)',
        'Tidak aus / tidak sobek', 'Harian', 'Pengecekan Visual', 'Pengecekan Visual', 40, true),
      (v_sa, v_coating_sa, 'AM-SA-CCU-044', 'Conformal Coating — Tipe',
        'Tipe coating: Letbond 1B31', 'Harian', 'Pengecekan Visual', 'Inspeksi', 50, true),
      (v_sa, v_coating_sa, 'AM-SA-CCU-045', 'Conformal Coating — Tanggal Kadaluarsa',
        'Tanggal kadaluarsa: Tidak kadaluarsa', 'Harian', 'Pengecekan Label', 'Inspeksi', 60, true),
      (v_sa, v_coating_sa, 'AM-SA-CCU-046', 'Conformal Coating — Tampilan UV',
        'Tampilan: Tidak ada bagian yang terlewat (touch up)', 'Harian', 'Pengecekan di bawah Lampu UV', 'Inspeksi', 70, true),
      (v_sa, v_coating_sa, 'AM-SA-CCU-047', 'Konfirmasi Chemical — Coating',
        'Sesuai chemical: Letbond 1B31', 'Harian', 'Pengecekan Visual', 'Inspeksi', 80, true),
      (v_sa, v_coating_sa, 'AM-SA-CCU-048', 'Konfirmasi Chemical — Tinner',
        'Sesuai chemical: Letbond Tinner', 'Harian', 'Pengecekan Visual', 'Inspeksi', 90, true)
    ON CONFLICT (line_id, code) DO UPDATE SET
      process_id = EXCLUDED.process_id, name = EXCLUDED.name, standard = EXCLUDED.standard,
      frequency = EXCLUDED.frequency, method = EXCLUDED.method, category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order, active = EXCLUDED.active;

  END IF; -- end SA-CCU-A

  -- ═══════════════════════════════════════════════════════════════════════
  -- LINE: FA-CCU-A  (73 items)
  -- ═══════════════════════════════════════════════════════════════════════
  IF v_fa IS NOT NULL THEN

    -- ── Coating PCBA — FA (1 item: AM-FA-CCU-001) ───────────────────────
    INSERT INTO autonomous_check_items
      (line_id, process_id, code, name, standard, frequency, method, category, sort_order, active)
    VALUES
      (v_fa, v_coating_fa, 'AM-FA-CCU-001', 'ESD PPE (APD ESD)',
        'Dipakai dengan benar, Wrist Strap berfungsi', 'Harian', 'Pengecekan Visual', 'K3', 10, true)
    ON CONFLICT (line_id, code) DO UPDATE SET
      process_id = EXCLUDED.process_id, name = EXCLUDED.name, standard = EXCLUDED.standard,
      frequency = EXCLUDED.frequency, method = EXCLUDED.method, category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order, active = EXCLUDED.active;

    -- ── BT Burning Beta (11 items: AM-FA-CCU-002 – 012) ─────────────────
    INSERT INTO autonomous_check_items
      (line_id, process_id, code, name, standard, frequency, method, category, sort_order, active)
    VALUES
      (v_fa, v_bt_beta, 'AM-FA-CCU-002', 'Air Blow Ionizer',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 10, true),
      (v_fa, v_bt_beta, 'AM-FA-CCU-003', 'Body Mesin',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 20, true),
      (v_fa, v_bt_beta, 'AM-FA-CCU-004', 'Test Needle / Pin Probe',
        'Bersih, bebas debu', 'Harian', 'Pembersihan dengan ESD Brush', 'Kebersihan', 30, true),
      (v_fa, v_bt_beta, 'AM-FA-CCU-005', 'Air Blow Ionizer — Fungsi',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 40, true),
      (v_fa, v_bt_beta, 'AM-FA-CCU-006', 'Burning Fixture',
        'Tidak kotor, sekrup jig tidak kendor, contact pin baik', 'Harian', 'Pengecekan Visual', 'Pengencangan', 50, true),
      (v_fa, v_bt_beta, 'AM-FA-CCU-007', 'Testing Chamber',
        'Buka-tutup berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 60, true),
      (v_fa, v_bt_beta, 'AM-FA-CCU-008', 'Server',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 70, true),
      (v_fa, v_bt_beta, 'AM-FA-CCU-009', 'ESD PPE (APD ESD)',
        'Dipakai dengan benar, Wrist Strap berfungsi', 'Harian', 'Pengecekan Visual', 'K3', 80, true),
      (v_fa, v_bt_beta, 'AM-FA-CCU-010', 'MC BT Beta & Monitor',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 90, true),
      (v_fa, v_bt_beta, 'AM-FA-CCU-011', 'Tekanan Udara Chamber',
        '0,4 – 0,6 MPa / 4 – 6 kgf', 'Harian', 'Pengecekan Visual', 'Pengukuran', 100, true),
      (v_fa, v_bt_beta, 'AM-FA-CCU-012', 'Mur pada Jig (Tidak Kendor)',
        'Mur tidak kendor (marking pada mur harus lurus)', 'Harian', 'Pengecekan Visual', 'Pengencangan', 110, true)
    ON CONFLICT (line_id, code) DO UPDATE SET
      process_id = EXCLUDED.process_id, name = EXCLUDED.name, standard = EXCLUDED.standard,
      frequency = EXCLUDED.frequency, method = EXCLUDED.method, category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order, active = EXCLUDED.active;

    -- ── BT Burning Official (9 items: AM-FA-CCU-013 – 021) ──────────────
    INSERT INTO autonomous_check_items
      (line_id, process_id, code, name, standard, frequency, method, category, sort_order, active)
    VALUES
      (v_fa, v_bt_official, 'AM-FA-CCU-013', 'Air Blow Ionizer',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 10, true),
      (v_fa, v_bt_official, 'AM-FA-CCU-014', 'Body Jig',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 20, true),
      (v_fa, v_bt_official, 'AM-FA-CCU-015', 'Test Needle / Pin Probe',
        'Bersih, bebas debu', 'Harian', 'Pembersihan dengan ESD Brush', 'Kebersihan', 30, true),
      (v_fa, v_bt_official, 'AM-FA-CCU-016', 'Air Blow Ionizer — Fungsi',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 40, true),
      (v_fa, v_bt_official, 'AM-FA-CCU-017', 'Burning Fixture — Contact Pin',
        'Contact pin dalam kondisi baik', 'Harian', 'Pengecekan Visual', 'Pengecekan Visual', 50, true),
      (v_fa, v_bt_official, 'AM-FA-CCU-018', 'Power Supply',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 60, true),
      (v_fa, v_bt_official, 'AM-FA-CCU-019', 'ESD PPE (APD ESD)',
        'Dipakai dengan benar, Wrist Strap berfungsi', 'Harian', 'Pengecekan Visual', 'K3', 70, true),
      (v_fa, v_bt_official, 'AM-FA-CCU-020', 'Flasher Portable',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 80, true),
      (v_fa, v_bt_official, 'AM-FA-CCU-021', 'Mur pada Jig (Tidak Kendor)',
        'Mur tidak kendor (marking pada mur harus lurus)', 'Harian', 'Pengecekan Visual', 'Pengencangan', 90, true)
    ON CONFLICT (line_id, code) DO UPDATE SET
      process_id = EXCLUDED.process_id, name = EXCLUDED.name, standard = EXCLUDED.standard,
      frequency = EXCLUDED.frequency, method = EXCLUDED.method, category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order, active = EXCLUDED.active;

    -- ── First Function Inspection (9 items: AM-FA-CCU-022 – 030) ────────
    INSERT INTO autonomous_check_items
      (line_id, process_id, code, name, standard, frequency, method, category, sort_order, active)
    VALUES
      (v_fa, v_ffi, 'AM-FA-CCU-022', 'Air Blow Ionizer',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 10, true),
      (v_fa, v_ffi, 'AM-FA-CCU-023', 'Meja Kerja (Workbench)',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 20, true),
      (v_fa, v_ffi, 'AM-FA-CCU-024', 'Body Jig',
        'Bersih, bebas debu', 'Harian', 'Pembersihan dengan ESD Brush', 'Kebersihan', 30, true),
      (v_fa, v_ffi, 'AM-FA-CCU-025', 'Air Blow Ionizer — Fungsi',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 40, true),
      (v_fa, v_ffi, 'AM-FA-CCU-026', 'ESD PPE (APD ESD)',
        'Dipakai dengan benar, Wrist Strap berfungsi', 'Harian', 'Pengecekan Visual', 'K3', 50, true),
      (v_fa, v_ffi, 'AM-FA-CCU-027', 'Monitor, Mouse, Keyboard, Printer',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 60, true),
      (v_fa, v_ffi, 'AM-FA-CCU-028', 'Scan Barcode',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 70, true),
      (v_fa, v_ffi, 'AM-FA-CCU-029', 'Jig First Function',
        'Berfungsi normal, tidak merusak part', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 80, true),
      (v_fa, v_ffi, 'AM-FA-CCU-030', 'Mur pada Jig (Tidak Kendor)',
        'Mur tidak kendor (marking pada mur harus lurus)', 'Harian', 'Pengecekan Visual', 'Pengencangan', 90, true)
    ON CONFLICT (line_id, code) DO UPDATE SET
      process_id = EXCLUDED.process_id, name = EXCLUDED.name, standard = EXCLUDED.standard,
      frequency = EXCLUDED.frequency, method = EXCLUDED.method, category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order, active = EXCLUDED.active;

    -- ── Print & Attach Label QR (7 items: AM-FA-CCU-031 – 037) ──────────
    INSERT INTO autonomous_check_items
      (line_id, process_id, code, name, standard, frequency, method, category, sort_order, active)
    VALUES
      (v_fa, v_print_label, 'AM-FA-CCU-031', 'Air Blow Ionizer',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 10, true),
      (v_fa, v_print_label, 'AM-FA-CCU-032', 'Meja Kerja (Workbench)',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 20, true),
      (v_fa, v_print_label, 'AM-FA-CCU-033', 'Body Jig',
        'Bersih, bebas debu', 'Harian', 'Pembersihan dengan ESD Brush', 'Kebersihan', 30, true),
      (v_fa, v_print_label, 'AM-FA-CCU-034', 'Air Blow Ionizer — Fungsi',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 40, true),
      (v_fa, v_print_label, 'AM-FA-CCU-035', 'ESD PPE (APD ESD)',
        'Dipakai dengan benar, Wrist Strap berfungsi', 'Harian', 'Pengecekan Visual', 'K3', 50, true),
      (v_fa, v_print_label, 'AM-FA-CCU-036', 'Label Printer',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 60, true),
      (v_fa, v_print_label, 'AM-FA-CCU-037', 'Jig Assy Label',
        'Tidak kendor', 'Harian', 'Pengecekan Visual', 'Pengencangan', 70, true)
    ON CONFLICT (line_id, code) DO UPDATE SET
      process_id = EXCLUDED.process_id, name = EXCLUDED.name, standard = EXCLUDED.standard,
      frequency = EXCLUDED.frequency, method = EXCLUDED.method, category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order, active = EXCLUDED.active;

    -- ── Potting PU (18 items: AM-FA-CCU-038 – 055) ──────────────────────
    INSERT INTO autonomous_check_items
      (line_id, process_id, code, name, standard, frequency, method, category, sort_order, active)
    VALUES
      (v_fa, v_potting, 'AM-FA-CCU-038', 'Meja Kerja (Workbench)',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 10, true),
      (v_fa, v_potting, 'AM-FA-CCU-039', 'Mesin / Potting Jig',
        'Bersih, tidak ada kotoran PU', 'Harian', 'Pengecekan Visual', 'Kebersihan', 20, true),
      (v_fa, v_potting, 'AM-FA-CCU-040', 'Suhu Ruangan (Room Control)',
        '25 ± 3 °C', 'Harian', 'Pengukuran dengan Temperature Checker', 'Pengukuran', 30, true),
      (v_fa, v_potting, 'AM-FA-CCU-041', 'Kelembaban Ruangan (Room Control)',
        '40 – 60 %', 'Harian', 'Pengukuran dengan Temperature Checker', 'Pengukuran', 40, true),
      (v_fa, v_potting, 'AM-FA-CCU-042', 'Motor Steering',
        'Motor berhenti normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 50, true),
      (v_fa, v_potting, 'AM-FA-CCU-043', 'Tekanan Tank N2 (A)',
        '0,45 – 0,65 kg/cm²', 'Harian', 'Pengecekan Visual', 'Pengukuran', 60, true),
      (v_fa, v_potting, 'AM-FA-CCU-044', 'Tekanan Tank N2 (B)',
        '0,45 – 0,65 kg/cm²', 'Harian', 'Pengecekan Visual', 'Pengukuran', 70, true),
      (v_fa, v_potting, 'AM-FA-CCU-045', 'Tekanan Utama (Main Pressure)',
        '5,63 – 7,65 kg/cm²', 'Harian', 'Pengecekan Visual', 'Pengukuran', 80, true),
      (v_fa, v_potting, 'AM-FA-CCU-046', 'Pre-heat Resin B (Tank)',
        '53 ± 5 °C', 'Harian', 'Mengacu pada IPQC Check WI', 'Pengukuran', 90, true),
      (v_fa, v_potting, 'AM-FA-CCU-047', 'Pre-heat Resin B (Hose)',
        '53 ± 5 °C', 'Harian', 'Mengacu pada IPQC Check WI', 'Pengukuran', 100, true),
      (v_fa, v_potting, 'AM-FA-CCU-048', 'Pre-heat Hardener A (Tank)',
        '33 ± 5 °C', 'Harian', 'Mengacu pada IPQC Check WI', 'Pengukuran', 110, true),
      (v_fa, v_potting, 'AM-FA-CCU-049', 'Pre-heat Hardener A (Hose)',
        '33 ± 5 °C', 'Harian', 'Mengacu pada IPQC Check WI', 'Pengukuran', 120, true),
      (v_fa, v_potting, 'AM-FA-CCU-050', 'Kecepatan Motor',
        '40 rpm', 'Harian', 'Pengecekan Visual', 'Pengukuran', 130, true),
      (v_fa, v_potting, 'AM-FA-CCU-051', 'Potting Machine',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 140, true),
      (v_fa, v_potting, 'AM-FA-CCU-052', 'Static Mixer',
        'Bersih, bebas residu PU', 'Harian', 'Pengecekan Visual', 'Kebersihan', 150, true),
      (v_fa, v_potting, 'AM-FA-CCU-053', 'Static Mixer (Tipe)',
        'P = 350 mm / Ø = 2,9 mm', 'Harian', 'Pengecekan Visual', 'Pengukuran', 160, true),
      (v_fa, v_potting, 'AM-FA-CCU-054', 'Tinggi Nozzle',
        '1 mm di atas PCBA – CCU Case', 'Harian', 'Pengecekan Visual', 'Pengukuran', 170, true),
      (v_fa, v_potting, 'AM-FA-CCU-055', 'Rasio Pencampuran (Mixing Ratio)',
        '50 : 100 ± 2 (Hardener : Polyurethane)', 'Harian', 'Pengukuran Berat (Weight Check)', 'Pengukuran', 180, true)
    ON CONFLICT (line_id, code) DO UPDATE SET
      process_id = EXCLUDED.process_id, name = EXCLUDED.name, standard = EXCLUDED.standard,
      frequency = EXCLUDED.frequency, method = EXCLUDED.method, category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order, active = EXCLUDED.active;

    -- ── Curing PU 12 Hours (4 items: AM-FA-CCU-056 – 059) ───────────────
    INSERT INTO autonomous_check_items
      (line_id, process_id, code, name, standard, frequency, method, category, sort_order, active)
    VALUES
      (v_fa, v_curing, 'AM-FA-CCU-056', 'Rak Penyimpanan (Storage Rack)',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 10, true),
      (v_fa, v_curing, 'AM-FA-CCU-057', 'Labeling Rack FIFO',
        'Terdapat labeling', 'Harian', 'Pengecekan Visual', 'Inspeksi', 20, true),
      (v_fa, v_curing, 'AM-FA-CCU-058', 'Suhu Ruangan (Room Control)',
        '25 ± 3 °C', 'Harian', 'Pengukuran dengan Temperature Checker', 'Pengukuran', 30, true),
      (v_fa, v_curing, 'AM-FA-CCU-059', 'Kelembaban Ruangan (Room Control)',
        '40 – 60 %', 'Harian', 'Pengukuran dengan Temperature Checker', 'Pengukuran', 40, true)
    ON CONFLICT (line_id, code) DO UPDATE SET
      process_id = EXCLUDED.process_id, name = EXCLUDED.name, standard = EXCLUDED.standard,
      frequency = EXCLUDED.frequency, method = EXCLUDED.method, category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order, active = EXCLUDED.active;

    -- ── Final Function Inspection (8 items: AM-FA-CCU-060 – 067) ────────
    INSERT INTO autonomous_check_items
      (line_id, process_id, code, name, standard, frequency, method, category, sort_order, active)
    VALUES
      (v_fa, v_final_fi, 'AM-FA-CCU-060', 'Body Mesin',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 10, true),
      (v_fa, v_final_fi, 'AM-FA-CCU-061', 'Meja Kerja (Workbench)',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 20, true),
      (v_fa, v_final_fi, 'AM-FA-CCU-062', 'Jig',
        'Bersih, bebas debu', 'Harian', 'Pembersihan dengan ESD Brush', 'Kebersihan', 30, true),
      (v_fa, v_final_fi, 'AM-FA-CCU-063', 'ESD PPE (APD ESD)',
        'Dipakai dengan benar', 'Harian', 'Pengecekan Visual', 'K3', 40, true),
      (v_fa, v_final_fi, 'AM-FA-CCU-064', 'Scan Barcode, Monitor, MC Function Check',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 50, true),
      (v_fa, v_final_fi, 'AM-FA-CCU-065', 'Tekanan Udara Chamber',
        '0,4 – 0,6 MPa / 4 – 6 kgf', 'Harian', 'Pengecekan Visual', 'Pengukuran', 60, true),
      (v_fa, v_final_fi, 'AM-FA-CCU-066', 'Digital Multimeter',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 70, true),
      (v_fa, v_final_fi, 'AM-FA-CCU-067', 'Mur pada Jig (Tidak Kendor)',
        'Mur tidak kendor (marking pada mur harus lurus)', 'Harian', 'Pengecekan Visual', 'Pengencangan', 80, true)
    ON CONFLICT (line_id, code) DO UPDATE SET
      process_id = EXCLUDED.process_id, name = EXCLUDED.name, standard = EXCLUDED.standard,
      frequency = EXCLUDED.frequency, method = EXCLUDED.method, category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order, active = EXCLUDED.active;

    -- ── Visual Inspection & Packing (6 items: AM-FA-CCU-068 – 073) ──────
    INSERT INTO autonomous_check_items
      (line_id, process_id, code, name, standard, frequency, method, category, sort_order, active)
    VALUES
      (v_fa, v_visual_pack, 'AM-FA-CCU-068', 'Meja Kerja (Workbench)',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 10, true),
      (v_fa, v_visual_pack, 'AM-FA-CCU-069', 'Kaca Pembesar (Magnifier)',
        'Bersih, bebas debu', 'Harian', 'Pengecekan Visual', 'Kebersihan', 20, true),
      (v_fa, v_visual_pack, 'AM-FA-CCU-070', 'ESD PPE (APD ESD)',
        'Dipakai dengan benar', 'Harian', 'Pengecekan Visual', 'K3', 30, true),
      (v_fa, v_visual_pack, 'AM-FA-CCU-071', 'Digital Multimeter',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 40, true),
      (v_fa, v_visual_pack, 'AM-FA-CCU-072', 'Saklar Current ON/OFF',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 50, true),
      (v_fa, v_visual_pack, 'AM-FA-CCU-073', 'Kaca Pembesar (Magnifier) — Fungsi',
        'Berfungsi normal', 'Harian', 'Pengecekan Visual', 'Pengecekan Fungsi', 60, true)
    ON CONFLICT (line_id, code) DO UPDATE SET
      process_id = EXCLUDED.process_id, name = EXCLUDED.name, standard = EXCLUDED.standard,
      frequency = EXCLUDED.frequency, method = EXCLUDED.method, category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order, active = EXCLUDED.active;

  END IF; -- end FA-CCU-A

  RAISE NOTICE 'Seeder selesai. SA-CCU-A: 48 item | FA-CCU-A: 73 item | Total: 121 item';

END $$;
