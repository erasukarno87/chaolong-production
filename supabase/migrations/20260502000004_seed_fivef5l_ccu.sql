-- ============================================================
-- SEEDER: 5F5L Check Items — FA-CCU-A (LINE FINAL ASSY CCU)
-- Source : 5F5L.pdf (5 First / 5 Last Inspection Checksheet)
--
-- 11 grup (No) | 19 sub-item total
-- Input types: ok_ng, float, text
--
-- Toleran terhadap line/process yang belum ada:
--   · Jika line FA-CCU-A tidak ditemukan → item dilewati
-- ============================================================

DO $$
DECLARE
  v_fa UUID;   -- Line FA-CCU-A

BEGIN
  -- ── 1. Ambil Line ID ──────────────────────────────────────────────────────
  SELECT id INTO v_fa FROM lines WHERE code = 'FA-CCU-A' LIMIT 1;

  IF v_fa IS NULL THEN
    RAISE NOTICE 'PERINGATAN: Line FA-CCU-A tidak ditemukan — seeder 5F5L dilewati.';
    RETURN;
  END IF;

  -- ── 2. Insert item check ──────────────────────────────────────────────────
  -- Kolom UNIQUE: (line_id, sort_group, sort_order)
  -- ON CONFLICT → update semua kolom (idempotent)

  INSERT INTO fivef5l_check_items
    (line_id, sort_group, group_name, specification, method, input_type, sort_order, active)
  VALUES

    -- ── No 1: Burning Program (BETA) ─────────────────────────────────────
    (v_fa, 1, 'Burning Program (BETA)',
      'Voltage step 1 : 1.5 ~ 1.7 V',
      'Visual', 'float', 10, true),

    (v_fa, 1, 'Burning Program (BETA)',
      'Voltage step 2 : 3.0 ~ 3.4 V',
      'Visual', 'float', 20, true),

    (v_fa, 1, 'Burning Program (BETA)',
      'Programming Success — No error messages',
      'Visual', 'ok_ng', 30, true),

    -- ── No 2: Semi-Finished function inspection ───────────────────────────
    (v_fa, 2, 'Semi-Finished function inspection',
      'Visual display Result Inspection (PASS)',
      'Visual', 'ok_ng', 10, true),

    -- ── No 3: Burning Program (BT official) ──────────────────────────────
    (v_fa, 3, 'Burning Program (BT official)',
      'Correct program version — BLE Software V2.E.04',
      'Visual', 'text', 10, true),

    (v_fa, 3, 'Burning Program (BT official)',
      'Voltage 2 : 3.0 ~ 3.4 V',
      'Visual', 'float', 20, true),

    (v_fa, 3, 'Burning Program (BT official)',
      'Programming Success — No error messages',
      'Visual', 'ok_ng', 30, true),

    -- ── No 4: Scanning QR Code PCB & Assembly PCBA with case ─────────────
    (v_fa, 4, 'Scanning QR Code PCB & Assembly PCBA with case',
      'QR is readable',
      'Visual', 'ok_ng', 10, true),

    -- ── No 5: First Function Inspection ──────────────────────────────────
    (v_fa, 5, 'First Function Inspection',
      'Broadcast Test (-40 dBm)',
      'Visual', 'ok_ng', 10, true),

    (v_fa, 5, 'First Function Inspection',
      'MCU V0.02 BLE V2.E.04',
      'Visual', 'ok_ng', 20, true),

    (v_fa, 5, 'First Function Inspection',
      'Test Result (PASS)',
      'Visual', 'ok_ng', 30, true),

    -- ── No 6: Serial Number ───────────────────────────────────────────────
    (v_fa, 6, 'Serial Number',
      'SN must be sequential / Cannot be double',
      'Visual', 'ok_ng', 10, true),

    -- ── No 7: Label Printing (Refer to YQS RR0021) ───────────────────────
    (v_fa, 7, 'Label Printing (Refer to YQS RR0021)',
      'Label pasted on correct position',
      'Visual', 'ok_ng', 10, true),

    (v_fa, 7, 'Label Printing (Refer to YQS RR0021)',
      'No chip, No blur, No detorsion, No film particle or dirt, No wrong content or letter missing',
      'Visual', 'ok_ng', 20, true),

    (v_fa, 7, 'Label Printing (Refer to YQS RR0021)',
      'Consist of 14 digit',
      'Visual', 'ok_ng', 30, true),

    (v_fa, 7, 'Label Printing (Refer to YQS RR0021)',
      'S/N not double',
      'Visual', 'ok_ng', 40, true),

    (v_fa, 7, 'Label Printing (Refer to YQS RR0021)',
      'P/N : DH7-H5810-00',
      'Visual', 'ok_ng', 50, true),

    -- ── No 8: IPQC weighing results ───────────────────────────────────────
    (v_fa, 8, 'IPQC weighing results',
      'Hardener 50 : PU 100 (± 2)',
      'Visual', 'ok_ng', 10, true),

    -- ── No 9: PU Dispensing ───────────────────────────────────────────────
    (v_fa, 9, 'PU Dispensing',
      'No void between pins / No over flow. PU height range: upper limit must not affect connector fitting, lower limit must contact with side edge of connector',
      'Visual', 'ok_ng', 10, true),

    -- ── No 10: Function Inspection & QR code scanning ─────────────────────
    (v_fa, 10, 'Function Inspection & QR code scanning',
      'Ampere: 19 - 23 mA',
      'Visual', 'float', 10, true),

    (v_fa, 10, 'Function Inspection & QR code scanning',
      'Judgment: PASS',
      'Visual', 'ok_ng', 20, true),

    -- ── No 11: Visual Inspection (Refer to YQS RR0021) ────────────────────
    (v_fa, 11, 'Visual Inspection (Refer to YQS RR0021)',
      'Check after 3.5 second CCU operation, Value < 70 μA',
      'Visual', 'ok_ng', 10, true),

    (v_fa, 11, 'Visual Inspection (Refer to YQS RR0021)',
      'No liquid bubbles on liquid surface, no spillage outside shell, no scratch on housing and label QR Code, Level PU follow drawing, No chip, No blur, No detorsion, No film particle or dirt, No wrong content or letter missing',
      'Visual', 'ok_ng', 20, true)

  ON CONFLICT (line_id, sort_group, sort_order) DO UPDATE SET
    group_name    = EXCLUDED.group_name,
    specification = EXCLUDED.specification,
    method        = EXCLUDED.method,
    input_type    = EXCLUDED.input_type,
    active        = EXCLUDED.active;

  RAISE NOTICE 'Seeder 5F5L selesai — FA-CCU-A: 11 grup, 23 item.';

END $$;
