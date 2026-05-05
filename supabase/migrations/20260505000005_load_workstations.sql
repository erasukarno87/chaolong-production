-- =============================================================================
-- Migration: 20260505000005_load_workstations
-- Purpose: Seed workstation data for production lines
-- 
-- This migration creates the 26 workstations (13 per line) that correspond
-- to the 13 manufacturing processes on each line. Essential for workstation-
-- level traceability in daily operations.
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: FA-CCU-A Line Workstations (Final Assembly)
-- =============================================================================

-- Process 1: BT Burning
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id, 
  'WS-FA-001', 'BT Burning Station A',
  'EQUIPMENT-FA-BT-001', 'Position 1 - Final Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'FA-CCU-A' AND p.code = 'BT-BURNING' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 2: First Function Inspection
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-FA-002', 'First Function Test Station A',
  'TEST-FA-FFI-001', 'Position 2 - Final Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'FA-CCU-A' AND p.code = 'FIRST-FUNC-INSPECT' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 3: Label Printing
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-FA-003', 'Label Printing Station A',
  'PRINTER-FA-LABEL-001', 'Position 3 - Final Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'FA-CCU-A' AND p.code = 'LABEL-PRINTING' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 4: Label Attaching
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-FA-004', 'Label Attach Station A',
  'EQUIPMENT-FA-LABEL-002', 'Position 4 - Final Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'FA-CCU-A' AND p.code = 'LABEL-ATTACH' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 5: Potting PU
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-FA-005', 'Potting PU Station A',
  'POTTING-FA-PU-001', 'Position 5 - Final Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'FA-CCU-A' AND p.code = 'POTTING-PU' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 6: Potting Curing
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-FA-006', 'Potting Cure Area A',
  'OVEN-FA-CURE-001', 'Cure Station - Final Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'FA-CCU-A' AND p.code = 'POTTING-CURE' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 7: Connector Soldering
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-FA-007', 'Soldering Station A',
  'SOLDERING-FA-001', 'Position 7 - Final Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'FA-CCU-A' AND p.code = 'CONNECTOR-SOLDER' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 8: Final Function Inspection
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-FA-008', 'Final Function Test Station A',
  'TEST-FA-FFI-FINAL-001', 'Position 8 - Final Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'FA-CCU-A' AND p.code = 'FINAL-FUNC-INSPECT' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 9: Visual Inspection
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-FA-009', 'Visual Inspection Station A',
  'VISUAL-FA-001', 'Position 9 - Final Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'FA-CCU-A' AND p.code = 'VISUAL-INSPECT' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 10: Weight & Dimension Check
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-FA-010', 'W&D Check Station A',
  'SCALE-MEASURE-FA-001', 'Measurement Station - Final Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'FA-CCU-A' AND p.code = 'WEIGHT-DIM-CHECK' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 11: Package & Label
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-FA-011', 'Packaging Station A',
  'PACKAGING-FA-001', 'Packaging Area - Final Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'FA-CCU-A' AND p.code = 'PACKAGE-LABEL' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 12: Final QC Check
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-FA-012', 'Final QC Station A',
  'QC-FA-001', 'QC Station - Final Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'FA-CCU-A' AND p.code = 'FINAL-QC' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 13: Archival/Storage
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-FA-013', 'Storage Area A',
  'STORAGE-FA-001', 'Final Products Storage - Final Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'FA-CCU-A' AND p.code = 'ARCHIVE-STORE' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- =============================================================================
-- SECTION 2: SA-CCU-A Line Workstations (Sub-Assembly)
-- =============================================================================

-- Process 1: PCBA Gluing
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-SA-001', 'PCBA Gluing Station A',
  'GLUE-SA-001', 'Position 1 - Sub-Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'SA-CCU-A' AND p.code = 'PCBA-GLUING' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 2: Connector Soldering
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-SA-002', 'Soldering Station A',
  'SOLDERING-SA-001', 'Position 2 - Sub-Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'SA-CCU-A' AND p.code = 'CONNECTOR-SOLDER' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 3: Flash Removal
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-SA-003', 'Flash Removal Station A',
  'FLASH-SA-001', 'Position 3 - Sub-Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'SA-CCU-A' AND p.code = 'FLASH-REMOVE' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 4: MCU Flashing
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-SA-004', 'MCU Flash Station A',
  'FLASH-MCU-SA-001', 'Position 4 - Sub-Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'SA-CCU-A' AND p.code = 'MCU-FLASHING' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 5: Current Test
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-SA-005', 'Current Test Station A',
  'TEST-CURRENT-SA-001', 'Position 5 - Sub-Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'SA-CCU-A' AND p.code = 'CURRENT-TEST' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 6: Conformal Coating
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-SA-006', 'Conformal Coating Station A',
  'COATING-SA-001', 'Position 6 - Sub-Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'SA-CCU-A' AND p.code = 'CONFORMAL-COAT' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 7: Coating Cure
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-SA-007', 'Coating Cure Area A',
  'OVEN-CURE-SA-001', 'Cure Station - Sub-Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'SA-CCU-A' AND p.code = 'COATING-CURE' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 8: X-Ray Inspection
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-SA-008', 'X-Ray Inspection Station A',
  'XRAY-SA-001', 'Position 8 - Sub-Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'SA-CCU-A' AND p.code = 'XRAY-INSPECT' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 9: Final Function Test
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-SA-009', 'Final Function Test Station A',
  'TEST-FINAL-SA-001', 'Position 9 - Sub-Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'SA-CCU-A' AND p.code = 'FINAL-FUNC-TEST' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 10: Visual Inspection
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-SA-010', 'Visual Inspection Station A',
  'VISUAL-SA-001', 'Position 10 - Sub-Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'SA-CCU-A' AND p.code = 'VISUAL-INSPECT' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 11: Weight & Dimension Check
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-SA-011', 'W&D Check Station A',
  'SCALE-MEASURE-SA-001', 'Measurement Station - Sub-Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'SA-CCU-A' AND p.code = 'WEIGHT-DIM-CHECK' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 12: Packaging & Label
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-SA-012', 'Packaging Station A',
  'PACKAGING-SA-001', 'Packaging Area - Sub-Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'SA-CCU-A' AND p.code = 'PACKAGE-LABEL' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- Process 13: Archive/Storage
INSERT INTO public.workstations (line_id, process_id, code, name, machine_number, location, status, active)
SELECT l.id, p.id,
  'WS-SA-013', 'Storage Area A',
  'STORAGE-SA-001', 'Completed Sub-Assembly Storage - Sub-Assembly',
  'active', true
FROM public.lines l, public.processes p
WHERE l.code = 'SA-CCU-A' AND p.code = 'ARCHIVE-STORE' AND p.line_id = l.id
ON CONFLICT (line_id, code) DO NOTHING;

-- =============================================================================
-- SECTION 3: Verification
-- =============================================================================

-- Count inserted workstations
DO $$
DECLARE
  v_ws_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_ws_count FROM public.workstations;
  RAISE NOTICE 'Total workstations created: %', v_ws_count;
END $$;

COMMIT;
