# 🚀 Quick Start Guide: Manufacturing Excellence Schema Migration

**For:** Database Administrators, DevOps Engineers  
**Time Required:** 30 minutes (Phase 1) + 30 minutes (Phase 2)  
**Difficulty:** Intermediate

---

## 📋 Prerequisites

### Required Tools
```bash
# Check you have these installed
psql --version          # PostgreSQL client
supabase --version      # Supabase CLI (optional)
git --version           # Git for version control
```

### Required Access
- [ ] Database admin credentials
- [ ] Supabase project access (if using Supabase)
- [ ] Staging environment access
- [ ] Production environment access (for final deployment)

### Required Knowledge
- Basic SQL and PostgreSQL
- Understanding of database migrations
- Familiarity with rollback procedures

---

## 🎯 What You'll Deploy

### Phase 1: Foundation & Versioning
- ✅ Version control for all master data
- ✅ Workstation management (separate from processes)
- ✅ Audit trail infrastructure
- ⏱️ **Time:** ~5 seconds execution, 0 downtime

### Phase 2: Item-Level Traceability
- ✅ Item-by-item inspection tracking
- ✅ Measurement recording with tolerances
- ✅ Lot/serial number tracking
- ⏱️ **Time:** ~10 seconds execution, 0 downtime

---

## 🔧 Step-by-Step Deployment

### Step 1: Backup Database (CRITICAL)

```bash
# Create backup directory
mkdir -p backups

# Backup entire database
pg_dump $DATABASE_URL > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup created
ls -lh backups/

# Test backup is valid (optional but recommended)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM lines;"
```

**⚠️ DO NOT PROCEED WITHOUT A BACKUP**

---

### Step 2: Deploy to Staging (Test First)

#### Option A: Using Supabase CLI (Recommended)

```bash
# 1. Link to staging project
supabase link --project-ref your-staging-project-ref

# 2. Check pending migrations
supabase db diff

# 3. Push Phase 1
supabase db push

# 4. Verify Phase 1
supabase db remote ls
```

#### Option B: Using psql Directly

```bash
# 1. Set staging database URL
export DATABASE_URL="postgresql://user:pass@staging-host:5432/dbname"

# 2. Run Phase 1 migration
psql $DATABASE_URL -f supabase/migrations/20260105000001_phase1_foundation_versioning.sql

# 3. Check for errors
echo $?  # Should return 0 if successful
```

---

### Step 3: Verify Phase 1 Deployment

```bash
# Run verification queries
psql $DATABASE_URL << 'EOF'

-- Check new tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('workstations', 'master_data_versions', 'workstation_parameters')
ORDER BY table_name;
-- Expected: 3 rows

-- Check versioning columns added
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name IN ('version', 'effective_from', 'effective_to')
ORDER BY table_name, column_name;
-- Expected: 21 rows (7 tables × 3 columns)

-- Test version control works
UPDATE lines SET name = name || ' (Test)' WHERE code = 'LINE-A';
SELECT table_name, record_id, version, effective_from 
FROM master_data_versions 
WHERE table_name = 'lines'
ORDER BY version DESC;
-- Expected: At least 1 row showing version history

-- Rollback test update
UPDATE lines SET name = REPLACE(name, ' (Test)', '') WHERE code = 'LINE-A';

EOF
```

**✅ Phase 1 Success Criteria:**
- [ ] 3 new tables created
- [ ] 21 versioning columns added
- [ ] Version control trigger works
- [ ] No errors in application logs
- [ ] All existing features still work

---

### Step 4: Test Phase 1 on Staging (1 Week)

```bash
# Daily health checks
psql $DATABASE_URL << 'EOF'

-- Check version history growth
SELECT table_name, COUNT(*) as version_count
FROM master_data_versions
GROUP BY table_name
ORDER BY table_name;

-- Check workstations
SELECT w.code, w.name, l.code as line_code, w.status
FROM workstations w
JOIN lines l ON l.id = w.line_id
ORDER BY w.code;

-- Check for errors
SELECT * FROM pg_stat_activity 
WHERE state = 'idle in transaction' 
  AND query_start < now() - interval '5 minutes';

EOF
```

**Monitor for:**
- [ ] No performance degradation
- [ ] No application errors
- [ ] Version history growing normally
- [ ] User feedback positive

---

### Step 5: Deploy Phase 2 to Staging

```bash
# After Phase 1 stable for 1 week

# Option A: Supabase CLI
supabase db push

# Option B: psql
psql $DATABASE_URL -f supabase/migrations/20260112000001_phase2_item_level_traceability.sql
```

---

### Step 6: Verify Phase 2 Deployment

```bash
psql $DATABASE_URL << 'EOF'

-- Check new tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('check_sheet_sessions', 'fivef5l_check_results', 'measurement_records')
ORDER BY table_name;
-- Expected: 3 rows

-- Check measurement columns added
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name IN ('measurement_value', 'lot_number', 'serial_number', 'workstation_id')
ORDER BY table_name, column_name;
-- Expected: Multiple rows

-- Check data migration (if old data existed)
SELECT 
  (SELECT COUNT(*) FROM check_sheet_results) as old_count,
  (SELECT COUNT(*) FROM check_sheet_sessions) as new_sessions,
  (SELECT COUNT(*) FROM fivef5l_check_results) as new_results;
-- Expected: new_sessions should match old_count if migration ran

-- Test session summary calculation
SELECT calculate_session_summary(id) 
FROM check_sheet_sessions 
LIMIT 1;
-- Expected: JSON object with summary statistics

EOF
```

**✅ Phase 2 Success Criteria:**
- [ ] 3 new tables created
- [ ] Measurement columns added
- [ ] Data migration completed (if applicable)
- [ ] Session summary calculation works
- [ ] No errors in application logs
- [ ] All existing features still work

---

### Step 7: Deploy to Production

```bash
# ONLY after both phases stable on staging for 1 week each

# 1. Schedule maintenance window (optional, 0 downtime expected)
# 2. Notify team
# 3. Backup production database
pg_dump $PROD_DATABASE_URL > backups/prod_backup_$(date +%Y%m%d_%H%M%S).sql

# 4. Set production database URL
export DATABASE_URL="$PROD_DATABASE_URL"

# 5. Deploy Phase 1
psql $DATABASE_URL -f supabase/migrations/20260105000001_phase1_foundation_versioning.sql

# 6. Verify Phase 1
# (Run verification queries from Step 3)

# 7. Wait 1 week, monitor

# 8. Deploy Phase 2
psql $DATABASE_URL -f supabase/migrations/20260112000001_phase2_item_level_traceability.sql

# 9. Verify Phase 2
# (Run verification queries from Step 6)

# 10. Monitor for 1 week
```

---

## 🔄 Rollback Procedures

### Rollback Phase 2 (If Issues Arise)

```bash
# 1. Backup current state first
pg_dump $DATABASE_URL > backups/before_rollback_$(date +%Y%m%d_%H%M%S).sql

# 2. Run rollback script
psql $DATABASE_URL -f supabase/migrations/rollback/20260112000001_rollback_phase2.sql

# 3. Verify rollback
psql $DATABASE_URL << 'EOF'
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('check_sheet_sessions', 'fivef5l_check_results', 'measurement_records');
-- Expected: 0 rows (tables dropped)

SELECT COUNT(*) FROM check_sheet_results;
-- Expected: Original count (data preserved)
EOF

# 4. Verify application works
curl https://your-app.com/health

# 5. Notify team
echo "Phase 2 rolled back successfully" | slack-notify
```

### Rollback Phase 1 (If Issues Arise)

```bash
# 1. Backup current state first
pg_dump $DATABASE_URL > backups/before_rollback_$(date +%Y%m%d_%H%M%S).sql

# 2. Run rollback script
psql $DATABASE_URL -f supabase/migrations/rollback/20260105000001_rollback_phase1.sql

# 3. Verify rollback
psql $DATABASE_URL << 'EOF'
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('workstations', 'master_data_versions', 'workstation_parameters');
-- Expected: 0 rows (tables dropped)

SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name IN ('version', 'effective_from', 'effective_to');
-- Expected: 0 rows (columns dropped)
EOF

# 4. Verify application works
curl https://your-app.com/health

# 5. Notify team
echo "Phase 1 rolled back successfully" | slack-notify
```

---

## 🐛 Troubleshooting

### Issue: Migration Fails with "relation already exists"

**Cause:** Migration was partially run before

**Solution:**
```bash
# Check what exists
psql $DATABASE_URL -c "\dt public.workstations"

# If table exists, either:
# Option 1: Drop and re-run
psql $DATABASE_URL -c "DROP TABLE IF EXISTS public.workstations CASCADE;"
psql $DATABASE_URL -f supabase/migrations/20260105000001_phase1_foundation_versioning.sql

# Option 2: Skip to next migration
# (if Phase 1 already complete)
```

### Issue: "permission denied for table"

**Cause:** Insufficient database privileges

**Solution:**
```bash
# Grant necessary permissions
psql $DATABASE_URL << 'EOF'
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO your_user;
EOF
```

### Issue: Application errors after migration

**Cause:** Application code not updated

**Solution:**
```bash
# Rollback migration
psql $DATABASE_URL -f supabase/migrations/rollback/20260112000001_rollback_phase2.sql

# Update application code
# Re-deploy application
# Re-run migration
```

### Issue: Performance degradation

**Cause:** Missing indexes or inefficient queries

**Solution:**
```bash
# Check slow queries
psql $DATABASE_URL << 'EOF'
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;
EOF

# Analyze tables
psql $DATABASE_URL -c "ANALYZE;"

# Check index usage
psql $DATABASE_URL << 'EOF'
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY tablename;
EOF
```

---

## 📊 Monitoring Queries

### Daily Health Check

```bash
psql $DATABASE_URL << 'EOF'

-- 1. Check version history growth
SELECT 
  table_name,
  COUNT(*) as total_versions,
  COUNT(DISTINCT record_id) as unique_records,
  MAX(version) as max_version
FROM master_data_versions
GROUP BY table_name
ORDER BY table_name;

-- 2. Check workstation status
SELECT 
  status,
  COUNT(*) as count
FROM workstations
GROUP BY status;

-- 3. Check session completion rate
SELECT 
  session_type,
  status,
  COUNT(*) as count
FROM check_sheet_sessions
WHERE created_at > now() - interval '7 days'
GROUP BY session_type, status
ORDER BY session_type, status;

-- 4. Check measurement records
SELECT 
  source_table,
  COUNT(*) as total_measurements,
  COUNT(*) FILTER (WHERE is_within_spec = false) as out_of_spec
FROM measurement_records
WHERE measured_at > now() - interval '7 days'
GROUP BY source_table;

-- 5. Check database size
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as db_size;

EOF
```

---

## ✅ Success Checklist

### Phase 1 Deployment
- [ ] Database backed up
- [ ] Migration script reviewed
- [ ] Deployed to staging
- [ ] Verification queries passed
- [ ] Tested for 1 week on staging
- [ ] No performance issues
- [ ] Team trained on new features
- [ ] Deployed to production
- [ ] Production verification passed
- [ ] Monitored for 1 week

### Phase 2 Deployment
- [ ] Phase 1 stable for 1 week
- [ ] Database backed up
- [ ] Migration script reviewed
- [ ] Deployed to staging
- [ ] Verification queries passed
- [ ] Data migration verified
- [ ] Tested for 1 week on staging
- [ ] No performance issues
- [ ] Team trained on new features
- [ ] Deployed to production
- [ ] Production verification passed
- [ ] Monitored for 1 week

---

## 📞 Getting Help

### Before Deployment
- Review: `MANUFACTURING_EXCELLENCE_IMPLEMENTATION_PLAN.md`
- Review: `PHASE_1_2_IMPLEMENTATION_SUMMARY.md`

### During Deployment
- **Database Issues:** Database Team Lead
- **Migration Errors:** DevOps Team
- **Emergency Rollback:** CTO + DevOps Lead

### After Deployment
- **Bug Reports:** GitHub Issues
- **Performance Issues:** DevOps Team
- **Feature Questions:** Product Team

---

## 🎉 You're Done!

Congratulations! You've successfully deployed the Manufacturing Excellence Schema.

**Next Steps:**
1. Monitor for 1 week
2. Gather user feedback
3. Plan Phase 3 deployment (Audit Trails)
4. Update application to use new features

---

*Last Updated: 2025-01-XX*  
*Document Version: 1.0*