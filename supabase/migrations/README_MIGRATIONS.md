# 📁 Database Migrations - Manufacturing Excellence Schema

**Project:** PT. Chao Long Motor Parts Indonesia  
**Purpose:** Transform database to meet ISO 9001:2015 / IATF 16949 compliance  
**Status:** Phase 1 & 2 Ready for Deployment

---

## 📂 Directory Structure

```
supabase/migrations/
├── README_MIGRATIONS.md                          ← You are here
├── 20260105000001_phase1_foundation_versioning.sql    ← Phase 1: Versioning & Workstations
├── 20260112000001_phase2_item_level_traceability.sql  ← Phase 2: Item-Level Tracking
├── rollback/
│   ├── 20260105000001_rollback_phase1.sql        ← Rollback Phase 1
│   └── 20260112000001_rollback_phase2.sql        ← Rollback Phase 2
└── [existing migrations...]
```

---

## 🎯 Migration Overview

### Phase 1: Foundation & Versioning
**File:** `20260105000001_phase1_foundation_versioning.sql`  
**Size:** ~800 lines  
**Execution Time:** ~5 seconds  
**Downtime:** 0 minutes  
**Risk:** 🟢 Low

**What It Does:**
- ✅ Adds version control to all master tables
- ✅ Creates workstations table (separate from processes)
- ✅ Creates master_data_versions tracking table
- ✅ Creates workstation_parameters table
- ✅ Adds audit columns (created_by, updated_by)
- ✅ Implements automatic version archiving

**Tables Created:** 3  
**Tables Modified:** 7  
**Columns Added:** 35  
**Functions Added:** 4  
**Triggers Added:** 6

---

### Phase 2: Item-Level Traceability
**File:** `20260112000001_phase2_item_level_traceability.sql`  
**Size:** ~1000 lines  
**Execution Time:** ~10 seconds  
**Downtime:** 0 minutes  
**Risk:** 🟡 Medium

**What It Does:**
- ✅ Creates check_sheet_sessions (groups results)
- ✅ Creates fivef5l_check_results (item-level 5F5L)
- ✅ Creates measurement_records (detailed measurements)
- ✅ Enhances autonomous_check_results
- ✅ Adds measurement fields to ng_entries
- ✅ Adds workstation_id to transaction tables
- ✅ Migrates existing data automatically

**Tables Created:** 3  
**Tables Modified:** 8  
**Columns Added:** 25  
**Functions Added:** 2  
**Triggers Added:** 4

---

## 🚀 How to Run Migrations

### Method 1: Supabase CLI (Recommended)

```bash
# 1. Link to your project
supabase link --project-ref your-project-ref

# 2. Check pending migrations
supabase db diff

# 3. Push all pending migrations
supabase db push

# 4. Verify
supabase db remote ls
```

### Method 2: psql (Manual)

```bash
# 1. Set database URL
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# 2. Run Phase 1
psql $DATABASE_URL -f 20260105000001_phase1_foundation_versioning.sql

# 3. Verify Phase 1
psql $DATABASE_URL -c "SELECT COUNT(*) FROM workstations;"

# 4. Wait 1 week, then run Phase 2
psql $DATABASE_URL -f 20260112000001_phase2_item_level_traceability.sql

# 5. Verify Phase 2
psql $DATABASE_URL -c "SELECT COUNT(*) FROM check_sheet_sessions;"
```

### Method 3: Supabase Dashboard (GUI)

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of migration file
3. Paste into SQL Editor
4. Click "Run"
5. Verify results in Table Editor

---

## 🔄 Rollback Procedures

### Rollback Phase 2

```bash
# If Phase 2 causes issues
psql $DATABASE_URL -f rollback/20260112000001_rollback_phase2.sql

# Verify rollback
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('check_sheet_sessions', 'fivef5l_check_results', 'measurement_records');"
# Should return 0 rows
```

### Rollback Phase 1

```bash
# If Phase 1 causes issues
psql $DATABASE_URL -f rollback/20260105000001_rollback_phase1.sql

# Verify rollback
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('workstations', 'master_data_versions', 'workstation_parameters');"
# Should return 0 rows
```

---

## ✅ Verification Queries

### After Phase 1

```sql
-- Check new tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('workstations', 'master_data_versions', 'workstation_parameters');
-- Expected: 3 rows

-- Check versioning columns
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name IN ('version', 'effective_from', 'effective_to')
ORDER BY table_name;
-- Expected: 21 rows

-- Test version control
UPDATE lines SET name = name || ' (Test)' WHERE code = 'LINE-A';
SELECT * FROM master_data_versions WHERE table_name = 'lines';
-- Expected: At least 1 version record

-- Cleanup test
UPDATE lines SET name = REPLACE(name, ' (Test)', '') WHERE code = 'LINE-A';
```

### After Phase 2

```sql
-- Check new tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('check_sheet_sessions', 'fivef5l_check_results', 'measurement_records');
-- Expected: 3 rows

-- Check data migration
SELECT 
  (SELECT COUNT(*) FROM check_sheet_results) as old_count,
  (SELECT COUNT(*) FROM check_sheet_sessions) as new_sessions,
  (SELECT COUNT(*) FROM fivef5l_check_results) as new_results;
-- Expected: new_sessions should match old_count if data existed

-- Test session summary
SELECT calculate_session_summary(id) 
FROM check_sheet_sessions 
LIMIT 1;
-- Expected: JSON object with summary
```

---

## 📊 Migration Dependencies

### Phase 1 Dependencies
```
Required:
  ✅ PostgreSQL 12+
  ✅ pgcrypto extension (already installed)
  ✅ Existing tables: lines, products, processes, shifts, defect_types, downtime_categories, skills
  ✅ Existing function: update_updated_at_column()
  ✅ Existing function: has_role()

Optional:
  ⚪ Supabase Realtime (for live updates)
```

### Phase 2 Dependencies
```
Required:
  ✅ Phase 1 completed successfully
  ✅ Existing tables: fivef5l_check_items, autonomous_check_items, autonomous_check_results
  ✅ Existing tables: ng_entries, hourly_outputs, downtime_entries
  ✅ Existing table: check_sheet_results (for data migration)

Optional:
  ⚪ Existing data in check_sheet_results (will be migrated)
```

---

## ⚠️ Important Notes

### Before Running Migrations

1. **ALWAYS BACKUP FIRST**
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test on Staging First**
   - Never run directly on production
   - Test for at least 1 week on staging
   - Verify all features work

3. **Check Dependencies**
   - Ensure all required tables exist
   - Ensure all required functions exist
   - Check PostgreSQL version

4. **Review Migration Scripts**
   - Read through the entire script
   - Understand what each section does
   - Check for any custom modifications needed

### During Migration

1. **Monitor Execution**
   - Watch for errors in real-time
   - Check execution time
   - Verify no locks or deadlocks

2. **Be Ready to Rollback**
   - Have rollback script ready
   - Know how to execute it quickly
   - Have team on standby

### After Migration

1. **Verify Immediately**
   - Run all verification queries
   - Check application still works
   - Test critical features

2. **Monitor for 1 Week**
   - Watch for performance issues
   - Check for application errors
   - Gather user feedback

3. **Document Issues**
   - Log any problems encountered
   - Document solutions applied
   - Update runbook if needed

---

## 🐛 Common Issues & Solutions

### Issue: "relation already exists"

**Cause:** Migration partially run before

**Solution:**
```sql
-- Check what exists
\dt public.workstations

-- If exists, drop and re-run
DROP TABLE IF EXISTS public.workstations CASCADE;
-- Then re-run migration
```

### Issue: "column already exists"

**Cause:** Column added in previous attempt

**Solution:**
```sql
-- Check if column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'lines' AND column_name = 'version';

-- If exists, migration already ran (skip or rollback first)
```

### Issue: "permission denied"

**Cause:** Insufficient privileges

**Solution:**
```sql
-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO your_user;
```

### Issue: "function does not exist"

**Cause:** Missing prerequisite function

**Solution:**
```sql
-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'update_updated_at_column';

-- If missing, create it
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
```

---

## 📈 Performance Impact

### Phase 1 Impact
- **Execution Time:** ~5 seconds
- **Downtime:** 0 minutes
- **Storage Increase:** ~10 MB (for version history)
- **Query Performance:** No degradation expected
- **Index Overhead:** Minimal (~12 new indexes)

### Phase 2 Impact
- **Execution Time:** ~10 seconds
- **Downtime:** 0 minutes
- **Storage Increase:** ~20 MB (for item-level results)
- **Query Performance:** Slight improvement (better indexes)
- **Index Overhead:** Minimal (~15 new indexes)

### Combined Impact
- **Total Storage Increase:** ~30 MB
- **Total New Indexes:** 27
- **Total New Tables:** 6
- **Expected Performance:** Same or better

---

## 🔐 Security Considerations

### Row Level Security (RLS)

✅ All new tables have RLS enabled  
✅ Policies follow existing pattern:  
  - `authenticated` users can read
  - `super_admin` can write
  - `leader` and `operator` can write to transaction tables

### Audit Trail

✅ All changes tracked with:  
  - Who made the change (`created_by`, `updated_by`)
  - When it was made (`created_at`, `updated_at`)
  - What was changed (version history in `master_data_versions`)

### Data Integrity

✅ Foreign key constraints enforced  
✅ Check constraints on critical fields  
✅ Unique constraints prevent duplicates  
✅ Triggers maintain data consistency

---

## 📚 Related Documentation

- **Planning Document:** `../MANUFACTURING_EXCELLENCE_IMPLEMENTATION_PLAN.md`
- **Implementation Summary:** `../PHASE_1_2_IMPLEMENTATION_SUMMARY.md`
- **Quick Start Guide:** `../QUICK_START_GUIDE.md`
- **Original Plan:** `../plan.md`

---

## 📞 Support

### Questions?
- **Database Issues:** Database Team Lead
- **Migration Problems:** DevOps Team
- **Compliance Questions:** Quality Manager

### Emergency?
- **Rollback Needed:** CTO + DevOps Lead
- **Production Down:** Incident Response Team

---

## ✅ Pre-Deployment Checklist

### Before Phase 1
- [ ] Database backed up
- [ ] Staging environment ready
- [ ] Team notified
- [ ] Rollback script tested
- [ ] Monitoring alerts configured

### Before Phase 2
- [ ] Phase 1 stable for 1 week
- [ ] Database backed up
- [ ] Data migration tested
- [ ] Team trained on new features
- [ ] Rollback script tested

---

**Last Updated:** 2025-01-XX  
**Document Version:** 1.0  
**Migration Version:** Phase 1 & 2

---

*For detailed deployment instructions, see `QUICK_START_GUIDE.md`*