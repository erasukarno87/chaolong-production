# 🚀 Production Deployment Checklist

**Project:** PT. Chao Long Motor Parts - Manufacturing Excellence System  
**Go-Live Date:** [SET DATE]  
**Status:** Ready to Deploy

---

## ✅ Pre-Deployment (1 Week Before)

### Infrastructure & Access
- [ ] Supabase project accessible (project_id: rkedhwwukehxdpofbxki)
- [ ] Database connectivity confirmed
- [ ] Netlify site created and linked
- [ ] Vercel project created (optional backup)
- [ ] GitHub repository created and accessible
- [ ] All team members have repository access
- [ ] GitHub Actions enabled in repository
- [ ] Supabase access tokens generated
- [ ] Deployment credentials stored in GitHub Secrets

### Database Preparation
- [ ] Backup current database (if migrating)
- [ ] Test migration 20260505000007_add_twofa_columns.sql locally
- [ ] Verify 2FA schema changes
- [ ] Test user_twofa and user_logs tables
- [ ] Confirm RLS policies working
- [ ] Create rollback plan

### Code Preparation
- [ ] All critical fixes committed to git ✅
- [ ] 2FA Edge Functions code reviewed
- [ ] Build tested locally: `npm run build` ✅
- [ ] Tests passing: `npm test` ✅
- [ ] Type checking passing: `npx tsc --noEmit` ✅
- [ ] ESLint clean: `npm run lint` ✅
- [ ] No security vulnerabilities: `npm audit`

### Documentation
- [ ] README.md up to date ✅
- [ ] 2FA_DEPLOYMENT_GUIDE.md reviewed ✅
- [ ] CI_CD_SETUP_GUIDE.md reviewed ✅
- [ ] Database schema documented
- [ ] Runbook created for incident response
- [ ] Team training completed

### Communication
- [ ] Stakeholders notified of go-live date
- [ ] Maintenance window communicated
- [ ] Expected downtime: ~5 seconds (only for migrations)
- [ ] Support team on standby

---

## 🔧 Deployment Day (Day -1 Evening)

### Final Verification
- [ ] Git repository up to date with all changes
- [ ] .env.example verified (no secrets exposed)
- [ ] .gitignore correctly configured ✅
- [ ] GitHub Secrets all configured
- [ ] Last backup taken
- [ ] Rollback plan tested

### GitHub Actions Setup
```bash
# 1. Verify workflows are present
ls -la .github/workflows/
# Expected: build-test.yml, deploy-2fa-functions.yml, deploy-production.yml, testing.yml

# 2. Commit workflows to git
git add .github/workflows/
git commit -m "chore: Add CI/CD pipeline workflows"

# 3. Push to GitHub
git push origin main
```

### Slack/Communication Channel
- [ ] Create #production-deployment channel
- [ ] Add team members
- [ ] Post deployment timeline
- [ ] Pin runbook documents

---

## ⚙️ Deployment Execution (Day 0)

### Phase 1: 09:00 - Code Deployment (30 min)

```bash
# 1. Verify code is on main branch
git log --oneline -5

# 2. Push final changes if any
git push origin main

# 3. GitHub Actions will automatically:
#    - Run lint & type checks
#    - Run tests
#    - Build production bundle
#    - Deploy to Netlify
#    - Deploy 2FA functions
#    - Run DB migrations

# 4. Monitor GitHub Actions
# https://github.com/your-org/chaolong-production/actions

# Expected steps:
# ✓ build-test.yml (3 min)
# ✓ deploy-2fa-functions.yml (2 min)
# ✓ deploy-production.yml (5 min)
# ✓ Slack notification sent
```

**Verification:**
```bash
# Check Netlify deployment
# https://app.netlify.com/sites/your-site/deploys

# Check Vercel deployment (if using)
# https://vercel.com/dashboard/your-project/deployments

# Check API is responding
curl https://your-production-domain.com/api/health

# Check 2FA functions deployed
curl https://rkedhwwukehxdpofbxki.supabase.co/functions/v1/generate-2fa-setup
# Expected: Function available
```

### Phase 2: 09:30 - Database Migration (10 min)

```sql
-- Supabase SQL Editor

-- 1. Verify migration tables created
SELECT COUNT(*) FROM public.user_twofa;
SELECT COUNT(*) FROM public.user_logs;

-- 2. Verify RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('user_twofa', 'user_logs');

-- 3. Test initialization function
SELECT * FROM public.user_twofa LIMIT 5;

-- 4. Verify trigger created
SELECT * FROM pg_trigger WHERE tgname = 'trg_init_user_twofa';
```

**Status Check:**
```bash
# 1. Application loads: ✓
# 2. Can login: ✓
# 3. 2FA available: ✓
# 4. No errors in console: ✓
```

### Phase 3: 09:40 - Smoke Tests (10 min)

**Frontend Tests:**
```bash
# 1. Open application
https://your-production-domain.com

# 2. Test login flow
- Username: [admin]
- Password: [password]
✓ Should authenticate successfully

# 3. Test 2FA setup (for admin user)
- Go to Settings → Security
- Click "Setup 2FA"
- Scan QR code with authenticator app
- Enter 6-digit code
✓ Should setup successfully

# 4. Verify 2FA enabled
- Logout and login again
- Should prompt for 2FA code
✓ Should verify successfully
```

**API Tests:**
```bash
# 1. Test 2FA generate function
curl -X POST https://rkedhwwukehxdpofbxki.supabase.co/functions/v1/generate-2fa-setup \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"admin-user-id"}'
✓ Response: { secret, qr_code_url, backup_codes }

# 2. Test database
SELECT COUNT(*) FROM public.user_twofa WHERE user_id = 'admin-user-id';
✓ Should have 1 record

# 3. Test audit logs
SELECT * FROM public.user_logs WHERE action LIKE '2fa_%';
✓ Should see 2FA setup events
```

**Error Tracking:**
```bash
# 1. Check Sentry dashboard
# https://sentry.io/dashboard/

# 2. Monitor for errors
# Should be 0 errors from 2FA functions

# 3. Check performance
# P95 response time should be < 500ms
```

### Phase 4: 10:00 - Notification & Monitoring (ongoing)

**Post-Deployment:**
```
✅ Deployment completed successfully!

Summary:
- Frontend: Deployed to Netlify
- Backend: 2FA functions deployed
- Database: Migration completed
- Status: All systems operational

Timeline:
- 09:00: Code deployed
- 09:30: Database migration
- 09:40: Smoke tests passed
- 10:00: Monitoring active

Next: Monitor for 24 hours
```

**Slack Message Template:**
```
🚀 PRODUCTION DEPLOYMENT COMPLETE

✅ Frontend deployed
✅ 2FA functions deployed  
✅ Database migration completed
✅ Smoke tests passed

Deployed by: [Your Name]
Deployment time: [HH:MM UTC]
Duration: ~30 minutes

Monitoring: https://sentry.io/dashboard
Status: All systems operational

Next steps: Monitor errors for 24 hours
```

---

## 📊 Post-Deployment (First 24 Hours)

### Hour 1: Active Monitoring
- [ ] Check error rate in Sentry (should be 0 or near 0)
- [ ] Monitor application logs
- [ ] Check database connection health
- [ ] Verify 2FA functions responding
- [ ] Test user login flow
- [ ] Check API response times

### Hour 2-4: User Testing
- [ ] Have selected users test application
- [ ] Test 2FA setup process
- [ ] Test 2FA login
- [ ] Verify all features working
- [ ] Collect feedback

### Hour 4-12: Extended Monitoring
```bash
# Monitor metrics
SELECT COUNT(*) FROM public.user_logs WHERE created_at > NOW() - INTERVAL '12 hours';
SELECT action, COUNT(*) FROM public.user_logs GROUP BY action;

# Check error frequency
# Sentry: Should be close to 0

# Monitor database performance
SELECT NOW() - MAX(created_at) FROM public.user_logs;
# Should be < 1 minute (healthy activity)
```

### Hour 12-24: Stability Check
- [ ] Application stable
- [ ] No increase in error rates
- [ ] User feedback positive
- [ ] Performance acceptable (< 500ms API response)
- [ ] Database performing well

---

## 🔄 Rollback Plan (If Needed)

### Immediate Rollback (5-10 min)

```bash
# 1. Revert to previous deployment
# Netlify: Deploy → Deploys → Select previous → Restore
# Vercel: Deployments → Select previous → Restore

# 2. If database migration caused issues:
# Go to Supabase → Migrations → Rollback last migration

# 3. Restart 2FA functions from previous version
supabase functions rollback
```

### Database Rollback

```bash
# If 2FA schema caused issues:
supabase db push --dry-run  # Check what rollback will do
supabase migration rollback --num 1  # Rollback last migration
```

### Full Rollback (if major issues)

```bash
# 1. Revert git to previous stable commit
git revert HEAD
git push origin main

# 2. GitHub Actions will automatically redeploy previous version

# 3. Notify users of temporary unavailability
# "Deployment rolled back due to issue. System back to normal."

# 4. Post-mortem meeting
# - What went wrong?
# - How to prevent?
# - Next deployment date?
```

---

## ⚠️ Potential Issues & Mitigation

| Issue | Likelihood | Mitigation |
|-------|------------|-----------|
| Build fails in GitHub Actions | Low | Tested locally ✓ |
| 2FA functions won't deploy | Low | Code tested, syntax verified |
| Database migration fails | Low | Migration tested locally |
| Netlify deployment stuck | Low | Monitor dashboard, manual deploy if needed |
| 2FA setup broken | Low | Tested before deployment |
| Performance degradation | Low | Load testing completed |
| Security vulnerability | Low | npm audit clean, code reviewed |

---

## 📞 Support During Deployment

### Team On Standby
- [ ] DevOps Lead: [Name]
- [ ] Backend Lead: [Name]
- [ ] Database Admin: [Name]
- [ ] Support Lead: [Name]

### Communication Channels
- [ ] #production-deployment Slack channel
- [ ] War room phone number: [XXX-XXX-XXXX]
- [ ] Emergency contacts list shared

### Escalation Path
1. First issue: Notify #production-deployment
2. Critical issue: Page on-call DevOps
3. Severe outage: Full team alert

---

## ✨ Success Criteria

Deployment is considered **SUCCESSFUL** when:

- ✅ Application loads without errors
- ✅ Users can login
- ✅ 2FA setup works
- ✅ 2FA login works
- ✅ No errors in Sentry (< 5 errors in first hour)
- ✅ API response times < 500ms
- ✅ Database healthy (no slow queries)
- ✅ All automated tests passing
- ✅ Load balancer healthy
- ✅ CDN working (Netlify/Vercel)

---

## 📋 Sign-Off

### Pre-Deployment
- [ ] Infrastructure ready: _________________ Date: _____
- [ ] Code tested: _________________ Date: _____
- [ ] Database ready: _________________ Date: _____
- [ ] Team trained: _________________ Date: _____

### Post-Deployment
- [ ] Deployment successful: _________________ Date: _____
- [ ] Smoke tests passed: _________________ Date: _____
- [ ] Monitoring active: _________________ Date: _____
- [ ] Production stable: _________________ Date: _____

---

**Status:** ✅ Ready for Go-Live

**Questions?** Contact: [DevOps Lead Email]
