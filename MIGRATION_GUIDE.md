# Complete Data Migration & Seeder Documentation

**Date:** May 5, 2026  
**Project:** PT. Chao Long Motor Parts - Manufacturing Excellence System  
**Status:** Initial Legacy Data Load (Phase 1-3)

---

## Overview

This documentation describes the complete initial migration and seeder files that load legacy manufacturing data from the `supabase/Old_Data/` directory into the Supabase PostgreSQL database.

The migration is split into **3 sequential files** to optimize for:
- Foreign key dependencies
- Data integrity
- Transaction size limits
- Clear logical grouping

---

## Migration Files

### 1. `20260505000001_load_old_data.sql` — Core Master Data
**Size:** ~50KB | **Records:** 500+  
**Execution Time:** ~2-3 seconds

#### What it loads:

**Reference Data (36 items)**
- NG Classes: 6 defect categories (Visual, Dimensional, Functional, etc.)
- Downtime Classes: 6 5M classifications (Man, Machine, Material, Method, Measurement, Environment)
- Product Categories: 8 product types (CCU, Sensor, Speedometer, etc.)
- Autonomous Check Categories: 8 check types (Kebersihan, Pengukuran, K3, etc.)
- Autonomous Check Frequencies: 4 schedules (Harian, Setiap Shift, Mingguan, Bulanan)

**Master Data (17 items)**
- Lines: 2 production lines (FA-CCU-A, SA-CCU-A)
- Products: 2 product variants (CCU full assembly, sub-assembly)
- Shifts: 3 shifts (S1: 07:00-15:00, S2: 15:00-23:00, S3: 23:00-07:00)

**User Management (10 items)**
- Profiles: 5 user accounts with authentication credentials
- User Roles: 5 role assignments (super_admin, admin, manager, leader, supervisor)

**Operators & Personnel (54 items)**
- Operators: 6 manufacturing operators (1 leader, 5 process operators)
- Operator Skills: 48 skill competency matrix entries
- Skills: 13 manufacturing skills (Gluing, Soldering, Burning, Inspection, etc.)

**Manufacturing Setup (39 items)**
- Processes: 13 manufacturing processes across 2 lines
- Process Skill Requirements: 13 minimum competency level assignments
- Product-Line Assignments: 2 product-line associations
- Production Targets: 1 CCU shift production target (1,600 units/shift)

**Organizational Structure (8 items)**
- Groups: 2 operator teams (one per line)
- Group Leaders: 1 leadership assignment (Syarif Hidayat → Group A, Line FA-CCU-A)

**Operator Assignments (14 items)**
- Operator-Line Assignments: 6 operator-line associations
- Operator-Process Assignments: 6 operator specializations
- Group-Process Assignments: 8 team-level process assignments

**Quality Control (40 items)**
- Defect Types: 20 NG/defect categories with IPC classifications
- Downtime Categories: 20 downtime reasons with planned/unplanned flags

**Check Sheet Templates (7 items)**
- Templates: 7 quality check templates (5 Autonomous, 2 5F5L)

---

### 2. `20260505000002_load_autonomous_checks.sql` — Autonomous Check Items
**Size:** ~25KB | **Records:** 80+  
**Execution Time:** ~1-2 seconds

#### What it loads:

**Autonomous Check Items (80+ items)**

These are daily equipment and environment checks for autonomous compliance:

**FA-CCU-A Line (50+ items):**
- Air Blow Ionizers (cleanliness checks, function tests) — 8 items
- Workbenches & Storage (cleanliness) — 6 items
- ESD PPE & Safety — 8 items
- Testing/Burning Equipment (chamber, fixture, program) — 8 items
- Environmental Monitoring (temperature, humidity) — 6 items
- Process-Specific Items (label printer, soldering, jig checks) — 8 items
- Measurement Checks (pressure, speed, weight ratio) — 6+ items

**SA-CCU-A Line (25+ items):**
- Gluing Process (material, expiry, part condition) — 5 items
- Soldering (temperature, tip condition, flux) — 5 items
- Flashing MCU (program, functional buttons) — 5 items
- Current Test (probe condition, dummy samples) — 5 items
- Conformal Coating (material, expiry, UV inspection) — 5+ items

**Check Properties:**
- Categories: Kebersihan, Pengecekan Fungsi, Pengukuran, Inspeksi, K3, Pengencangan, Pelumasan
- Frequencies: Harian (Daily), Setiap Shift (Per shift), Mingguan (Weekly)
- Methods: Visual inspection, Manual checks, Temperature measurement, Weight checking
- Standard Specifications: Detailed acceptance criteria per item

---

### 3. `20260505000003_load_fivef5l_checks.sql` — 5F5L Check Items
**Size:** ~12KB | **Records:** 28  
**Execution Time:** ~1 second

#### What it loads:

**5F5L Check Items (28 process-specific items)**

5F5L (Five First, Five Last) = First 5 products of shift + Last 5 products of shift

**Process Coverage:**

| Process | Line | Check Items | Spec Type |
|---------|------|-------------|-----------|
| BT Burning Beta | FA-CCU-A | 4 | Voltage values (float), visual pass/fail |
| BT Burning Official | FA-CCU-A | 3 | Program version, voltage, success status |
| First Function Inspection | FA-CCU-A | 4 | MCU version, QR code, broadcast, test result |
| Label Printing & Attach | FA-CCU-A | 6 | Position, P/N, digit count, S/N uniqueness |
| Print & Attach Label QR | FA-CCU-A | 2 | Serial number tracking, sequential check |
| Visual Inspection & Packing | FA-CCU-A | 2 | Appearance, packaging quality |
| Potting PU | FA-CCU-A | 2 | Dispensing quality, weight ratio |
| Final Function Inspection | FA-CCU-A | 2 | Pass judgment, ampere value |

| Process | Line | Check Items | Spec Type |
|---------|------|-------------|-----------|
| Gluing PCBA | SA-CCU-A | 1 | Component positioning |
| Soldering Connector | SA-CCU-A | 1 | Soldering quality per IPC-A610 |
| Flashing MCU | SA-CCU-A | 2 | Program version, display status |
| Current Test | SA-CCU-A | 1 | Current measurement (28-32 mA) |
| Coating PCBA | SA-CCU-A | 1 | Chemical confirmation |

**Input Types:**
- `ok_ng`: Pass/Fail binary (PASS/FAIL)
- `float`: Numeric measurement with tolerances (e.g., 3.0 ~ 3.4 V)
- `text`: Free-form text entry (version numbers, specifications)

---

## Execution Instructions

### Prerequisites

```bash
# Ensure Supabase CLI is installed
supabase --version

# Connect to your project
supabase link --project-id <your-project-id>
```

### Apply Migrations

```bash
# Navigate to project root
cd /path/to/prod-system-chaolong

# Apply migrations in order (automatic via Supabase)
supabase migration up

# Or manually via SQL:
# 1. Paste contents of 20260505000001_load_old_data.sql
# 2. Paste contents of 20260505000002_load_autonomous_checks.sql
# 3. Paste contents of 20260505000003_load_fivef5l_checks.sql
```

### Verify Data Load

```sql
-- Check master data
SELECT COUNT(*) as line_count FROM "public"."lines"; -- Should be 2
SELECT COUNT(*) as product_count FROM "public"."products"; -- Should be 2
SELECT COUNT(*) as operator_count FROM "public"."operators"; -- Should be 6
SELECT COUNT(*) as process_count FROM "public"."processes"; -- Should be 13

-- Check autonomous items
SELECT COUNT(*) as autonomous_count FROM "public"."autonomous_check_items"; -- Should be 80+

-- Check 5F5L items
SELECT COUNT(*) as fivef5l_count FROM "public"."fivef5l_check_items"; -- Should be 28

-- Check reference data
SELECT COUNT(*) as skill_count FROM "public"."skills"; -- Should be 13
SELECT COUNT(*) as defect_count FROM "public"."defect_types"; -- Should be 20
SELECT COUNT(*) as downtime_count FROM "public"."downtime_categories"; -- Should be 20
```

---

## Data Structure Summary

### Total Records Loaded

| Category | Count | Notes |
|----------|-------|-------|
| Reference Data | 36 | Lookup tables for classifications |
| Master Data | 19 | Lines, products, shifts, etc. |
| Users | 10 | Profiles, roles, authentication |
| Operators | 6 | Manufacturing personnel |
| Skills | 13 | Competency definitions |
| Operator Skills | 48 | Skill matrix (6 × 8+ skills) |
| Processes | 13 | Manufacturing steps |
| Process Skills | 13 | Skill requirements |
| Product Assignments | 2 | Product-line links |
| Production Targets | 1 | Shift quotas |
| Groups | 2 | Operator teams |
| Group Leaders | 1 | Team leadership |
| Assignments | 14 | Operator-line-process links |
| Defect Types | 20 | NG categories |
| Downtime Categories | 20 | Loss reason classifications |
| Check Templates | 7 | Quality template definitions |
| Autonomous Items | 80+ | Daily equipment checks |
| 5F5L Items | 28 | Process-specific quality specs |
| **TOTAL** | **~450+** | **Complete factory setup** |

---

## Data Relationships

```
lines (2)
├── products (2) → product_lines
├── processes (13)
│   ├── process_skill_requirements → skills (13)
│   ├── autonomous_check_items (80+)
│   └── fivef5l_check_items (28)
├── groups (2)
│   └── group_leaders (1) → user_roles
│   └── group_process_assignments (8) → operators
└── operator_line_assignments (6) → operators

operators (6)
├── operator_skills (48) → skills (13)
├── operator_line_assignments (6) → lines
├── operator_process_assignments (6) → processes
└── supervisor_id (self-referential)

profiles (5) → user_roles (5)

production_targets → lines, products, shifts (3)

Quality Data:
├── defect_types (20)
├── downtime_categories (20)
├── check_sheet_templates (7)
├── autonomous_check_items (80+)
└── fivef5l_check_items (28)

Reference Data:
├── ref_ng_classes (6)
├── ref_downtime_classes (6)
├── ref_product_categories (8)
├── ref_autonomous_categories (8)
└── ref_autonomous_frequencies (4)
```

---

## Key Features of This Data Load

### ✅ Foreign Key Integrity
- All foreign key references are validated
- No orphaned records
- Proper cascade relationships

### ✅ Idempotent Operations
- `ON CONFLICT DO NOTHING` clauses prevent duplicates
- Safe to re-run migrations
- Can be applied multiple times safely

### ✅ Complete Manufacturing Setup
- 2 production lines fully configured
- 6 operators with competency matrix
- 13 processes with skill requirements
- 80+ daily autonomous checks
- 28 process-specific quality specs

### ✅ Production Ready
- Roles & authentication configured
- User permissions set (super_admin, admin, manager, leader, supervisor)
- Production targets defined
- Quality templates ready
- Autonomous check framework in place

### ✅ Extensible Design
- Room to add more operators, processes
- Modular skill system
- Flexible autonomous check categories
- Support for multiple products/lines

---

## Next Steps

### Phase 4: Production Tracking Data
After applying these migrations, you can load:
- Shift run records (production batches)
- Hourly production output
- NG entry records (defects)
- Downtime entries
- Check sheet results

### Phase 5: Historical Data
- Past shift performance metrics
- Operator efficiency tracking
- Equipment utilization trends
- Quality trend analysis

### Phase 6: Advanced Features
- Predictive maintenance data
- KPI dashboards
- Autonomous improvement suggestions
- Supply chain integration

---

## Troubleshooting

### Foreign Key Constraint Errors
```sql
-- Check if process_id exists
SELECT id FROM "public"."processes" 
WHERE id = '<process-id>';

-- Fix autonomous items pointing to non-existent processes
DELETE FROM "public"."autonomous_check_items"
WHERE process_id NOT IN (SELECT id FROM "public"."processes");
```

### Duplicate Key Errors
```sql
-- If migration fails on duplicate key:
-- Already applied successfully - check with:
SELECT COUNT(*) FROM "public"."operators";

-- To reset (CAREFUL!):
DELETE FROM "public"."operators" WHERE employee_code IN 
  ('EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005', 'EMP-006');
```

### Missing Data Validation
```sql
-- Verify completeness:
SELECT 
  (SELECT COUNT(*) FROM "public"."lines") as lines,
  (SELECT COUNT(*) FROM "public"."products") as products,
  (SELECT COUNT(*) FROM "public"."operators") as operators,
  (SELECT COUNT(*) FROM "public"."processes") as processes,
  (SELECT COUNT(*) FROM "public"."autonomous_check_items") as checks;
```

---

## Migration Rollback

To rollback these migrations:

```bash
# Rollback last 3 migrations
supabase migration down 3

# Or revert specific migration
supabase migration down --version 20260505000003
supabase migration down --version 20260505000002
supabase migration down --version 20260505000001
```

---

## Performance Notes

- **Total Execution Time:** ~5-7 seconds for all 3 migrations
- **Database Size:** ~2-3 MB for complete data load
- **Recommended Frequency:** One-time initial load
- **Ideal Deployment:** Before production launch

---

## Support & Maintenance

### Regular Updates
- Monthly operator skill assessments
- Quarterly process improvements
- Annual competency reviews

### Data Validation
- Verify foreign keys monthly
- Audit role assignments quarterly
- Check process capability indices annually

### Backup Strategy
```bash
# Export current state
pg_dump -U postgres -h localhost -d chaolong_db -Fc > backup_$(date +%Y%m%d).dump

# Restore from backup
pg_restore -U postgres -h localhost -d chaolong_db -c backup_20260505.dump
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-05  
**Maintained By:** Manufacturing Systems Team
