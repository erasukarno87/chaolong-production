# Production Operations & Data Entry Guide

**Date:** May 5, 2026  
**Project:** PT. Chao Long Motor Parts - Manufacturing Excellence System  
**Purpose:** Daily production tracking and shift data entry procedures

---

## Overview

The production tracking system captures real-time manufacturing data for each shift across both production lines (FA-CCU-A and SA-CCU-A). This guide explains how to enter and manage daily production data.

---

## Daily Shift Workflow

### Pre-Shift: Setup (Before 7:00 AM for S1, Before 15:00 for S2, Before 23:00 for S3)

```sql
-- 1. Create Shift Run Record
INSERT INTO "public"."shift_runs" 
  (id, line_id, shift_id, product_id, target_qty, hourly_target, status, created_at) 
VALUES
  (
    'uuid-v4-here', 
    '63f05394-78b9-4658-8168-38f29467047a',  -- FA-CCU-A line
    '8918a012-d115-496b-a49c-ef32d261fdcd',  -- S1 (7:00-15:00)
    '0ed3823a-10c7-4655-b8f1-898dfc788ce2',  -- CCU Product
    1600,      -- Target: 1600 units for shift
    200,       -- Hourly target: 200 units/hour
    'setup',   -- Status starts as setup
    now()
  );
```

**What to record:**
- **line_id**: Which production line (FA-CCU-A or SA-CCU-A)
- **shift_id**: Which shift (S1/S2/S3)
- **product_id**: What product is being produced
- **target_qty**: Total expected production for shift (usually 1600 for FA-CCU-A)
- **hourly_target**: Average expected per hour (1600 ÷ 8 working hours = 200)
- **status**: "setup" initially, changes to "running", "paused", or "completed"

### During Shift: Hourly Recording (Every Hour)

**Every hour on the hour:**

```sql
-- 2. Record Hourly Production Output
INSERT INTO "public"."hourly_outputs" 
  (id, shift_run_id, hour_index, actual_qty, ng_qty, created_at) 
VALUES
  (
    'uuid-v4-here',
    'shift-run-id-from-above',  -- Reference to today's shift run
    1,                           -- Hour 1 (07:00-08:00 for S1)
    185,                         -- Actual units produced this hour
    4,                           -- Units with defects (NG) this hour
    now()
  );
```

**What to record:**
- **shift_run_id**: Link to the shift run created at pre-shift
- **hour_index**: 1-8 (8 working hours, lunch break doesn't count)
- **actual_qty**: How many units were actually completed this hour
- **ng_qty**: How many of those units had quality issues

**Timeline for S1 (typical 3-shift operation):**

| Hour | Time | Actual | Status |
|------|------|--------|--------|
| 1 | 07:00-08:00 | Record units produced | Warm-up period |
| 2 | 08:00-09:00 | Record units produced | Ramp-up |
| 3 | 09:00-10:00 | Record units produced | Normal operation |
| 4 | 10:00-11:00 | Record units produced | Normal operation |
| 5 | 11:00-12:00 | Record units produced | Normal operation |
| BREAK | 12:00-13:00 | Lunch break (60 min) | Planned downtime |
| 6 | 13:00-14:00 | Record units produced | Post-break |
| 7 | 14:00-15:00 | Record units produced | Normal operation |
| 8 | 15:00-15:30 | Record units produced | Final push |

### Quality Tracking: NG Entries (When Defects Occur)

```sql
-- 3. Record NG (Not Good) Defect Details
INSERT INTO "public"."ng_entries" 
  (id, shift_run_id, hour_index, qty, created_at) 
VALUES
  (
    'uuid-v4-here',
    'shift-run-id',        -- Same shift run
    1,                     -- Hour 1
    4,                     -- 4 units had defects
    now()
  );
```

**Important Notes:**
- **ng_entries.qty should match hourly_outputs.ng_qty** (reconcile daily)
- Track the process where NG occurred:
  - GluingPCBA (SA-CCU-A)
  - SolderingConnector (SA-CCU-A)
  - FlashingMCU (SA-CCU-A)
  - CurrentTest (SA-CCU-A)
  - CoatingPCBA (SA-CCU-A)
  - BurnBetaTest (FA-CCU-A)
  - BurnOfficialTest (FA-CCU-A)
  - FirstFunctionInspection (FA-CCU-A)
  - LabelPrintAttach (FA-CCU-A)
  - PottingPU (FA-CCU-A)
  - CuringPU (FA-CCU-A)
  - FinalFunctionInspection (FA-CCU-A)
  - VisualPackaging (FA-CCU-A)

### Loss Tracking: Downtime Entries (Equipment Issues)

```sql
-- 4. Record Downtime Events
INSERT INTO "public"."downtime_entries" 
  (id, shift_run_id, category_id, kind, started_at, ended_at, duration_minutes, created_at) 
VALUES
  (
    'uuid-v4-here',
    'shift-run-id',
    '505b1c7f-02f7-4ea6-b2e0-e58cccd327db',  -- Category: Man (operator issue)
    'planned',                                 -- 'planned' or 'unplanned'
    '2026-05-05 12:00:00+00',                 -- When downtime started
    '2026-05-05 13:00:00+00',                 -- When downtime ended
    60,                                        -- Duration in minutes
    now()
  );
```

**Downtime Categories (5M Model):**
- **Man (505b1c7f-02f7-4ea6-b2e0-e58cccd327db)**: Operator issue, training, safety
- **Machine (b89fd445-dcd5-4521-be71-84ee0a9a2a64)**: Equipment failure, mechanical
- **Material (5bfc948c-48aa-408f-b6c4-f0adf0f8289e)**: Supply shortage, component defect
- **Method (af258e3b-c6f2-4570-8e8b-eeca0d5c68ef)**: Process problem, procedure issue
- **Measurement (23c5000a-75c7-46ed-a296-a553a6cc1563)**: Calibration, testing issue
- **Environment (ea244c37-8c0c-4ddc-a18c-2b8080bfaea7)**: Temperature, humidity, facility

**Downtime Kinds:**
- **planned**: Scheduled maintenance, breaks, lunch (expected)
- **unplanned**: Equipment failure, quality issue, accident (unexpected)

### End of Shift: Completion (15:00 for S1, 23:00 for S2, 07:00 for S3)

```sql
-- 5. Update Shift Run to Completed
UPDATE "public"."shift_runs"
SET status = 'completed'
WHERE id = 'shift-run-id'
  AND status = 'running';
```

**Before marking complete, verify:**
- [ ] All 8 hourly_outputs records entered
- [ ] ng_entries reconciled with hourly_outputs
- [ ] All downtime events recorded with accurate duration
- [ ] Quality check sheets completed
- [ ] Autonomous checks logged
```

---

## Data Entry Checklist

### Hourly (Every Hour)

- [ ] Production count entered for the hour
- [ ] NG quantity recorded
- [ ] Any downtime during hour documented
- [ ] Defect process identified (if NG > 0)

### Daily (End of Shift)

- [ ] All 8 hourly records complete
- [ ] Shift run marked as "completed"
- [ ] Downtime summary verified
- [ ] Quality metrics calculated

### Weekly

- [ ] Production targets vs. actuals analyzed
- [ ] Defect trends reviewed
- [ ] Downtime patterns identified
- [ ] Operator performance evaluated

### Monthly

- [ ] OEE (Overall Equipment Effectiveness) calculated
- [ ] Quality trend analysis
- [ ] Process capability reviewed
- [ ] Maintenance schedule updated

---

## Example: Complete Shift Entry

### Sample Shift: May 5, 2026 - S1 - FA-CCU-A Line

```sql
-- Create Shift Run
INSERT INTO shift_runs (id, line_id, shift_id, product_id, target_qty, hourly_target, status, created_at)
VALUES (
  'd5e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a',
  '63f05394-78b9-4658-8168-38f29467047a',  -- FA-CCU-A
  '8918a012-d115-496b-a49c-ef32d261fdcd',  -- S1
  '0ed3823a-10c7-4655-b8f1-898dfc788ce2',  -- CCU Product
  1600, 200, 'setup', now()
);

-- Hour 1 (07:00-08:00): Warm-up
INSERT INTO hourly_outputs VALUES ('h-001', 'd5e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a', 1, 160, 5, now());
INSERT INTO ng_entries VALUES ('ng-001', 'd5e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a', 1, 5, now());

-- Hour 2 (08:00-09:00): Ramp-up
INSERT INTO hourly_outputs VALUES ('h-002', 'd5e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a', 2, 190, 4, now());
INSERT INTO ng_entries VALUES ('ng-002', 'd5e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a', 2, 4, now());

-- Hour 3-8: Continue pattern...

-- Downtime: Lunch Break
INSERT INTO downtime_entries VALUES (
  'dt-001',
  'd5e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a',
  '505b1c7f-02f7-4ea6-b2e0-e58cccd327db',  -- Man
  'planned',
  '2026-05-05 12:00:00+00',
  '2026-05-05 13:00:00+00',
  60, now()
);

-- Mark Complete at 15:00
UPDATE shift_runs
SET status = 'completed'
WHERE id = 'd5e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a';
```

### Expected Results:
```
Total Production:  1,600 units (100% of target)
Total NG:          28 units (1.75% defect rate)
Total Downtime:    75 minutes (60 planned + 15 unplanned)
OEE:               (1600 / 1600) × (1572 / 1600) × (405 / 480) = 84.4%
```

---

## Production Metrics & KPIs

### Key Metrics by Shift

| Metric | Formula | Target | Example |
|--------|---------|--------|---------|
| Production Rate | actual_qty ÷ hourly_target | 100% | 1,600 ÷ 1,600 = 100% |
| Quality Rate | (actual_qty - ng_qty) ÷ actual_qty | 98%+ | 1,572 ÷ 1,600 = 98.3% |
| Availability | (shift_time - downtime) ÷ shift_time | 95%+ | 405 ÷ 480 = 84.4% |
| Performance | (target_qty ÷ actual_qty) × time_ratio | 100% | Calculated from above |
| OEE | Quality × Availability × Performance | 80%+ | 98.3% × 84.4% × 100% = 83.0% |

### Defect Analysis

```sql
-- Daily NG Summary by Process
SELECT 
  p.name,
  COUNT(DISTINCT ngpc.id) as ng_count,
  SUM(ngpc.qty) as total_ng,
  ROUND(100.0 * SUM(ngpc.qty) / 1600, 2) as defect_rate_percent
FROM ng_entries ngpc
JOIN shift_runs sr ON ngpc.shift_run_id = sr.id
JOIN processes p ON sr.product_id = p.line_id
WHERE sr.created_at::date = '2026-05-05'
GROUP BY p.name
ORDER BY total_ng DESC;
```

### Downtime Analysis

```sql
-- Daily Downtime Summary by Category
SELECT 
  ref_downtime_classes.name,
  COUNT(de.id) as event_count,
  SUM(de.duration_minutes) as total_minutes,
  ROUND(100.0 * SUM(de.duration_minutes) / 480, 2) as percentage_of_shift
FROM downtime_entries de
JOIN shift_runs sr ON de.shift_run_id = sr.id
JOIN ref_downtime_classes ON de.category_id = ref_downtime_classes.id
WHERE sr.created_at::date = '2026-05-05'
GROUP BY ref_downtime_classes.name
ORDER BY total_minutes DESC;
```

---

## Common Issues & Troubleshooting

### Issue 1: NG Entries Don't Match Hourly NG

**Problem:** `ng_entries.qty` total ≠ `hourly_outputs.ng_qty`

**Solution:**
```sql
-- Check for discrepancies
SELECT 
  ho.hour_index,
  ho.ng_qty as recorded_ng,
  SUM(ne.qty) as sum_ng_entries,
  (ho.ng_qty - SUM(ne.qty)) as difference
FROM hourly_outputs ho
LEFT JOIN ng_entries ne ON ho.shift_run_id = ne.shift_run_id 
  AND ho.hour_index = ne.hour_index
GROUP BY ho.hour_index, ho.ng_qty
HAVING ho.ng_qty != SUM(ne.qty);

-- Reconcile: Either update hourly_outputs or add missing ng_entries
```

### Issue 2: Downtime Duration Wrong

**Problem:** `downtime_entries.duration_minutes` doesn't match (ended_at - started_at)

**Solution:**
```sql
-- Find and fix mismatches
UPDATE downtime_entries
SET duration_minutes = EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
WHERE shift_run_id = 'shift-id'
  AND duration_minutes != EXTRACT(EPOCH FROM (ended_at - started_at)) / 60;
```

### Issue 3: Missing Hourly Records

**Problem:** Only 6 hourly_outputs instead of 8

**Solution:**
```sql
-- Find which hours are missing
SELECT hour_index 
FROM generate_series(1, 8) AS hour_index
EXCEPT
SELECT hour_index FROM hourly_outputs WHERE shift_run_id = 'shift-id'
ORDER BY hour_index;
```

---

## Mobile App vs. Manual Entry

The system supports two data entry methods:

### Method 1: Mobile App (Recommended)
- Real-time data entry during shift
- Automatic timestamp recording
- Validation and error checking
- Offline capability with sync

### Method 2: Manual SQL Entry
- Use above examples
- Best for batch import or corrections
- Requires database access
- Use for historical data or bulk updates

---

## Security & Audit Trail

All production data entry is audited:
- User ID recorded for each entry
- Timestamps in UTC timezone
- Immutable after 24 hours
- Changes logged to audit table

---

## Next Steps for New Shifts

1. **Create shift_run** at shift start (30 min before production)
2. **Update status to "running"** when production begins
3. **Record hourly_outputs** every hour for 8 hours
4. **Log NG & downtime** events as they occur
5. **Update status to "completed"** at shift end
6. **Review metrics** and identify improvement opportunities

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-05  
**For Questions:** Contact Manufacturing Systems Team
