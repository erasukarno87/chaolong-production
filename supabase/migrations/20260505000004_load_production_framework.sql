-- Migration: Production Tracking Framework (Part 4)
-- Date: 2026-05-05
-- Purpose: Initialize production tracking infrastructure with baseline shift template
-- Tables: shift_runs, hourly_outputs, ng_entries, downtime_entries
-- Status: Framework ready for shift data entry

-- ============================================================================
-- PHASE 10: Production Tracking Framework
-- ============================================================================

-- Shift Runs: Production batch records (one per line per shift)
-- Note: These are template records to establish baseline. Populate with actual shift data during operations.
INSERT INTO "public"."shift_runs" ("id", "line_id", "shift_id", "product_id", "target_qty", "hourly_target", "status", "started_at", "created_at", "updated_at") VALUES
-- FA-CCU-A Production Target for S1: 1600 units/shift = 200 units/hour (8 hours working)
('01234567-89ab-cdef-0123-456789abcdef', '63f05394-78b9-4658-8168-38f29467047a', '8918a012-d115-496b-a49c-ef32d261fdcd', '0ed3823a-10c7-4655-b8f1-898dfc788ce2', 1600, 200, 'setup', null, '2026-05-05 00:00:00+00', '2026-05-05 00:00:00+00')
ON CONFLICT DO NOTHING;

-- Hourly Outputs: Production records by hour
-- Framework: 8 working hours per shift (60 min break excluded)
-- Template data for reference: showing typical production distribution
INSERT INTO "public"."hourly_outputs" ("id", "shift_run_id", "hour_index", "actual_qty", "ng_qty", "created_at", "updated_at") VALUES
-- Hour 1: Warm-up, typically lower output (160 units, 5 NG)
('11111111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', 1, 160, 5, '2026-05-05 08:00:00+00', '2026-05-05 08:00:00+00'),
-- Hour 2: Ramp-up (190 units, 4 NG)
('22222222-2222-2222-2222-222222222222', '01234567-89ab-cdef-0123-456789abcdef', 2, 190, 4, '2026-05-05 09:00:00+00', '2026-05-05 09:00:00+00'),
-- Hour 3: Normal operation (205 units, 3 NG)
('33333333-3333-3333-3333-333333333333', '01234567-89ab-cdef-0123-456789abcdef', 3, 205, 3, '2026-05-05 10:00:00+00', '2026-05-05 10:00:00+00'),
-- Hour 4: Peak production (210 units, 2 NG)
('44444444-4444-4444-4444-444444444444', '01234567-89ab-cdef-0123-456789abcdef', 4, 210, 2, '2026-05-05 11:00:00+00', '2026-05-05 11:00:00+00'),
-- Hour 5: Peak production (210 units, 3 NG)
('55555555-5555-5555-5555-555555555555', '01234567-89ab-cdef-0123-456789abcdef', 5, 210, 3, '2026-05-05 12:00:00+00', '2026-05-05 12:00:00+00'),
-- Hour 6: Post-break ramp (200 units, 4 NG)
('66666666-6666-6666-6666-666666666666', '01234567-89ab-cdef-0123-456789abcdef', 6, 200, 4, '2026-05-05 13:30:00+00', '2026-05-05 13:30:00+00'),
-- Hour 7: Normal operation (205 units, 3 NG)
('77777777-7777-7777-7777-777777777777', '01234567-89ab-cdef-0123-456789abcdef', 7, 205, 3, '2026-05-05 14:30:00+00', '2026-05-05 14:30:00+00'),
-- Hour 8: Final hour (220 units, 2 NG) - higher push to meet target
('88888888-8888-8888-8888-888888888888', '01234567-89ab-cdef-0123-456789abcdef', 8, 220, 2, '2026-05-05 15:00:00+00', '2026-05-05 15:00:00+00')
ON CONFLICT DO NOTHING;

-- NG Entries: Quality records (detailed defect tracking)
-- Linked to hourly_outputs, these track which processes had defects
INSERT INTO "public"."ng_entries" ("id", "shift_run_id", "hour_index", "qty", "created_at") VALUES
-- Hour 1: 5 NG from FA-CCU-A (typical warm-up defects)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '01234567-89ab-cdef-0123-456789abcdef', 1, 5, '2026-05-05 08:00:00+00'),
-- Hour 2: 4 NG
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '01234567-89ab-cdef-0123-456789abcdef', 2, 4, '2026-05-05 09:00:00+00'),
-- Hour 3: 3 NG
('cccccccc-cccc-cccc-cccc-cccccccccccc', '01234567-89ab-cdef-0123-456789abcdef', 3, 3, '2026-05-05 10:00:00+00'),
-- Hour 4: 2 NG (low defect rate at peak)
('dddddddd-dddd-dddd-dddd-dddddddddddd', '01234567-89ab-cdef-0123-456789abcdef', 4, 2, '2026-05-05 11:00:00+00'),
-- Hour 5: 3 NG
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '01234567-89ab-cdef-0123-456789abcdef', 5, 3, '2026-05-05 12:00:00+00'),
-- Hour 6: 4 NG (post-break)
('ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', 6, 4, '2026-05-05 13:30:00+00'),
-- Hour 7: 3 NG
('10101010-1010-1010-1010-101010101010', '01234567-89ab-cdef-0123-456789abcdef', 7, 3, '2026-05-05 14:30:00+00'),
-- Hour 8: 2 NG (final push, focused)
('20202020-2020-2020-2020-202020202020', '01234567-89ab-cdef-0123-456789abcdef', 8, 2, '2026-05-05 15:00:00+00')
ON CONFLICT DO NOTHING;

-- Downtime Entries: Machine downtime and loss events
-- Framework for tracking planned maintenance and unplanned stoppages
INSERT INTO "public"."downtime_entries" ("id", "shift_run_id", "category_id", "kind", "started_at", "ended_at", "duration_minutes", "created_at") VALUES
-- Planned maintenance break (60 min): Usually after hour 5 (standard 1-hour lunch)
('30303030-3030-3030-3030-303030303030', '01234567-89ab-cdef-0123-456789abcdef', '505b1c7f-02f7-4ea6-b2e0-e58cccd327db', 'planned', '2026-05-05 12:00:00+00', '2026-05-05 13:00:00+00', 60, '2026-05-05 12:00:00+00'),
-- Example unplanned downtime (15 min): Minor mechanical adjustment
('40404040-4040-4040-4040-404040404040', '01234567-89ab-cdef-0123-456789abcdef', 'b89fd445-dcd5-4521-be71-84ee0a9a2a64', 'unplanned', '2026-05-05 10:45:00+00', '2026-05-05 11:00:00+00', 15, '2026-05-05 10:45:00+00')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Production Tracking Framework Summary
-- ============================================================================
-- This migration establishes the infrastructure for continuous production tracking
--
-- Key Features:
-- 1. Shift Runs: Master record per line per shift (status: setup → running → completed)
-- 2. Hourly Outputs: Production quantity + NG quantity by hour
-- 3. NG Entries: Detailed defect tracking linked to hours
-- 4. Downtime Entries: Loss events (both planned and unplanned)
--
-- Typical Shift Flow:
--   Hour 0:     Setup shift (prepare line, tools, materials)
--   Hour 1-5:   Morning production (160-210 units/hour)
--   Hour 5:     Lunch break (60 minutes planned downtime)
--   Hour 6-8:   Afternoon production (200-220 units/hour)
--   Status:     "completed" when all hourly records are entered
--
-- Production Quality Metrics:
--   Total target:  1600 units/shift
--   Actual:        1600 units (100% achievement)
--   NG Total:      28 units (1.75% defect rate)
--   Downtime:      75 minutes (60 planned + 15 unplanned)
--   Effective Time: 460 minutes of 480 total minutes (95.8%)
--
-- Next Steps for Daily Operations:
-- 1. Create shift_run at start of shift with target quantity and hourly target
-- 2. Record hourly_outputs every hour with actual production count and NG quantity
-- 3. Create ng_entries to track defect details by process/category
-- 4. Create downtime_entries for any stoppages (both planned and unplanned)
-- 5. Update shift_run status to "completed" at end of shift
--
-- Notes:
-- - All timestamps should be in UTC+00 timezone
-- - hourly_outputs.ng_qty should match sum of ng_entries for that hour (reconcile daily)
-- - downtime_entries.kind = 'planned' (maintenance, break) or 'unplanned' (equipment failure)
-- - downtime_entries.duration_minutes must be calculated: (ended_at - started_at)
-- ============================================================================

-- Data Load Status: Framework Ready
-- Note: These are sample/template records showing typical production patterns.
-- Replace with actual daily shift data as operations begin.
