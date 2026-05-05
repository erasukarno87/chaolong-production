# 📇 Quick Reference Card: Manufacturing Excellence Schema

**Print This:** Keep at your desk during deployment  
**Version:** Phase 1 & 2  
**Last Updated:** 2025-01-XX

---

## 🚀 Quick Deploy Commands

### Backup Database
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Deploy Phase 1
```bash
psql $DATABASE_URL -f supabase/migrations/20260105000001_phase1_foundation_versioning.sql
```

### Deploy Phase 2
```bash
psql $DATABASE_URL -f supabase/migrations/20260112000001_phase2_item_level_traceability.sql
```

### Rollback Phase 2
```bash
psql $DATABASE_URL -f supabase/migrations/rollback/20260112000001_rollback_phase2.sql
```

### Rollback Phase 1
```bash
psql $DATABASE_URL -f supabase/migrations/rollback/20260105000001_rollback_phase1.sql
```

---

## ✅ Quick Verification

### Phase 1 Check
```sql
-- Should return 3
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name IN ('workstations', 'master_data_versions', 'workstation_parameters');

-- Should return 21
SELECT COUNT(*) FROM information_schema.columns 
WHERE column_name IN ('version', 'effective_from', 'effective_to');
```

### Phase 2 Check
```sql
-- Should return 3
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name IN ('check_sheet_sessions', 'fivef5l_check_results', 'measurement_records');

-- Check data migration
SELECT 
  (SELECT COUNT(*) FROM check_sheet_results) as old,
  (SELECT COUNT(*) FROM check_sheet_sessions) as new;
```

---

## 📊 Health Check Queries

### Version History
```sql
SELECT table_name, COUNT(*) as versions
FROM master_data_versions
GROUP BY table_name;
```

### Workstation Status
```sql
SELECT status, COUNT(*) 
FROM workstations 
GROUP BY status;
```

### Session Summary
```sql
SELECT session_type, status, COUNT(*)
FROM check_sheet_sessions
WHERE created_at > now() - interval '7 days'
GROUP BY session_type, status;
```

### Performance Check
```sql
SELECT 
  schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

---

## 🐛 Common Issues

### "relation already exists"
```sql
DROP TABLE IF EXISTS workstations CASCADE;
-- Then re-run migration
```

### "column already exists"
```sql
-- Check if already migrated
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'lines' AND column_name = 'version';
-- If exists, skip or rollback first
```

### "permission denied"
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO your_user;
```

---

## 📞 Emergency Contacts

| Issue | Contact |
|-------|----------|
| **Database Error** | Database Team Lead |
| **Application Down** | DevOps Team |
| **Need Rollback** | CTO + DevOps Lead |
| **Compliance Question** | Quality Manager |

---

## 📚 Document Quick Links

| Need | Document |
|------|----------|
| **Overview** | EXECUTIVE_SUMMARY_MANUFACTURING_EXCELLENCE.md |
| **Full Plan** | MANUFACTURING_EXCELLENCE_IMPLEMENTATION_PLAN.md |
| **How to Deploy** | QUICK_START_GUIDE.md |
| **Checklist** | DEPLOYMENT_CHECKLIST.md |
| **Technical Details** | PHASE_1_2_IMPLEMENTATION_SUMMARY.md |

---

## ⏱️ Expected Timings

| Task | Time |
|------|------|
| **Phase 1 Execution** | ~5 seconds |
| **Phase 2 Execution** | ~10 seconds |
| **Verification** | ~2 minutes |
| **Rollback** | ~5 seconds |
| **Full Deployment** | ~30 minutes |

---

## ✅ Success Criteria

### Phase 1
- [ ] 3 new tables created
- [ ] 21 versioning columns added
- [ ] Version control trigger works
- [ ] No application errors
- [ ] Performance stable

### Phase 2
- [ ] 3 new tables created
- [ ] Measurement columns added
- [ ] Data migration complete
- [ ] No application errors
- [ ] Performance stable

---

## 🎯 Key Metrics

| Metric | Target |
|--------|--------|
| **Downtime** | 0 minutes |
| **Query Time** | < 200ms |
| **CPU Usage** | < 50% |
| **Memory Usage** | < 80% |
| **Error Rate** | 0% |

---

**Keep this card handy during deployment!**

*For detailed instructions, refer to QUICK_START_GUIDE.md*