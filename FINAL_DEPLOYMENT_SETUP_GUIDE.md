# 📋 Final Deployment Setup Guide

**Date:** May 6, 2026  
**Project:** PT. Chao Long Motor Parts - chaolong-production  
**Repository:** https://github.com/erasukarno87/chaolong-production  
**Status:** Ready for deployment

---

## 🔑 **Task 1: Add GitHub Secrets**

### **What Are GitHub Secrets?**
Secrets store sensitive information (API keys, tokens) securely in GitHub. They're used by CI/CD workflows without exposing them in code.

### **Step 1: Go to GitHub Repository Settings**

```
https://github.com/erasukarno87/chaolong-production/settings/secrets/actions
```

Or:
1. Go to https://github.com/erasukarno87/chaolong-production
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**

### **Step 2: Add Each Secret**

Click **"New repository secret"** and add these secrets:

#### **Supabase Credentials**

```
Name: SUPABASE_PROJECT_ID
Value: rkedhwwukehxdpofbxki
```

```
Name: SUPABASE_ACCESS_TOKEN
Value: [Your Supabase access token]
```

**How to get Supabase access token:**
1. Go to https://app.supabase.com/account/tokens
2. Create new token: "chaolong-production-deploy"
3. Copy the token
4. Paste into GitHub Secret

```
Name: SUPABASE_URL
Value: https://rkedhwwukehxdpofbxki.supabase.co
```

```
Name: SUPABASE_ANON_KEY
Value: [Your Supabase anon key from project settings]
```

#### **Deployment Credentials**

```
Name: NETLIFY_SITE_ID
Value: [Your Netlify site ID]
```

**How to get Netlify site ID:**
1. Create site on Netlify: https://app.netlify.com
2. Go to Site settings → General
3. Copy "Site ID"

```
Name: NETLIFY_AUTH_TOKEN
Value: [Your Netlify personal access token]
```

**How to get Netlify auth token:**
1. Go to https://app.netlify.com/user/applications/personal
2. Create new token: "chaolong-production"
3. Copy and paste

#### **Optional: Vercel Deployment**

```
Name: VERCEL_TOKEN
Value: [Your Vercel token]
```

```
Name: VERCEL_PROJECT_ID
Value: [Your Vercel project ID]
```

```
Name: VERCEL_ORG_ID
Value: [Your Vercel organization ID]
```

#### **Notifications (Optional)**

```
Name: SLACK_WEBHOOK
Value: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**How to get Slack webhook:**
1. Go to your Slack workspace
2. Create incoming webhook at https://api.slack.com/apps
3. Copy webhook URL

### **Verification**

After adding all secrets, go to **Settings → Secrets and variables → Actions** and verify:
- ✅ SUPABASE_PROJECT_ID
- ✅ SUPABASE_ACCESS_TOKEN
- ✅ SUPABASE_URL
- ✅ SUPABASE_ANON_KEY
- ✅ NETLIFY_SITE_ID
- ✅ NETLIFY_AUTH_TOKEN

---

## ⬆️ **Task 2: Apply Database Migration**

### **Prerequisites**

Install Supabase CLI:

```bash
npm install -g @supabase/cli
```

Verify installation:

```bash
supabase --version
# Should output: supabase 1.x.x or newer
```

### **Step 1: Login to Supabase**

```bash
supabase login
```

This opens a browser window to authenticate. Follow the prompts.

### **Step 2: Link Your Project**

```bash
supabase link --project-ref rkedhwwukehxdpofbxki
```

When prompted:
- Database password: [Enter your Supabase DB password]
- or choose "Skip for now" if you prefer

### **Step 3: Apply Migrations**

```bash
cd c:\prod-system-chaolong
supabase migration up
```

**Expected output:**
```
Applying migrations...
✓ 20260505000007_add_twofa_columns.sql

Successfully applied 1 migration.
```

### **Step 4: Verify Migration**

```bash
# Check tables were created
supabase db pull --schema public

# Or query directly in Supabase console:
# SELECT COUNT(*) FROM public.user_twofa;
# SELECT COUNT(*) FROM public.user_logs;
```

---

## 🚀 **Task 3: Deploy 2FA Edge Functions**

### **Prerequisites**
- Supabase CLI installed and logged in (from Task 2)
- Project linked

### **Step 1: Deploy generate-2fa-setup**

```bash
supabase functions deploy generate-2fa-setup --project-ref rkedhwwukehxdpofbxki
```

Expected output:
```
✓ Deployed function generate-2fa-setup
✓ Endpoint: https://rkedhwwukehxdpofbxki.supabase.co/functions/v1/generate-2fa-setup
```

### **Step 2: Deploy verify-2fa-setup**

```bash
supabase functions deploy verify-2fa-setup --project-ref rkedhwwukehxdpofbxki
```

Expected output:
```
✓ Deployed function verify-2fa-setup
✓ Endpoint: https://rkedhwwukehxdpofbxki.supabase.co/functions/v1/verify-2fa-setup
```

### **Step 3: Deploy verify-2fa-code**

```bash
supabase functions deploy verify-2fa-code --project-ref rkedhwwukehxdpofbxki
```

Expected output:
```
✓ Deployed function verify-2fa-code
✓ Endpoint: https://rkedhwwukehxdpofbxki.supabase.co/functions/v1/verify-2fa-code
```

### **Step 4: Verify Deployment**

```bash
supabase functions list --project-ref rkedhwwukehxdpofbxki
```

Expected output:
```
Verifying Edge Functions...
✓ generate-2fa-setup
✓ verify-2fa-setup
✓ verify-2fa-code

All functions deployed successfully.
```

### **Step 5: View Function Logs**

```bash
supabase functions logs generate-2fa-setup --project-ref rkedhwwukehxdpofbxki
```

---

## ✅ **Task 4: Run Smoke Tests**

### **Test 1: Local Build Test**

```bash
cd c:\prod-system-chaolong

# Test build
npm run build

# Check build output
ls dist/
# Should have index.html and other assets
```

**Expected:** No errors, dist/ folder created with ~2-5 MB of files

### **Test 2: Test 2FA Database Tables**

Using Supabase SQL Editor:

```sql
-- Test 1: Verify tables exist
SELECT COUNT(*) as user_twofa_count FROM public.user_twofa;
SELECT COUNT(*) as user_logs_count FROM public.user_logs;

-- Test 2: Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename IN ('user_twofa', 'user_logs')
ORDER BY tablename, policyname;

-- Test 3: Verify triggers
SELECT * FROM pg_trigger 
WHERE tgname = 'trg_init_user_twofa';

-- Test 4: Test initialization (create test user)
INSERT INTO public.user_twofa (user_id, twofa_enabled)
VALUES (gen_random_uuid(), false);

-- Test 5: Check the record was created
SELECT * FROM public.user_twofa ORDER BY created_at DESC LIMIT 1;
```

**Expected:** All queries return results, no errors

### **Test 3: Test 2FA Edge Functions**

#### **3a. Generate 2FA Setup**

```bash
# Get a JWT token first (you need to authenticate as a user)
# For testing, use a valid JWT from your auth provider

curl -X POST https://rkedhwwukehxdpofbxki.supabase.co/functions/v1/generate-2fa-setup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "00000000-0000-0000-0000-000000000000"
  }'
```

**Expected response:**
```json
{
  "secret": "JBSWY3DPEBLW64TMMQ======",
  "qr_code_url": "otpauth://totp/...",
  "backup_codes": ["ABC12345", "DEF67890", ...]
}
```

#### **3b. Check Function Logs**

```bash
supabase functions logs generate-2fa-setup
# Should show recent invocations
```

### **Test 4: Git & GitHub Status**

```bash
cd c:\prod-system-chaolong

# Verify local repo
git status
# Should show: "On branch main, nothing to commit, working tree clean"

# Verify remote
git remote -v
# Should show: origin git@github.com:erasukarno87/chaolong-production.git

# Verify sync
git log -1
# Should show latest commit hash from origin
```

### **Test 5: CI/CD Pipeline Test**

Create a test PR to trigger CI/CD:

```bash
# Create feature branch
git checkout -b test/ci-pipeline

# Make a small change (e.g., update README)
echo "# Test CI/CD Pipeline" >> README.md

# Commit and push
git add README.md
git commit -m "test: trigger CI/CD pipeline"
git push -u origin test/ci-pipeline
```

Then:
1. Go to https://github.com/erasukarno87/chaolong-production/pulls
2. Create Pull Request
3. Go to **Actions** tab
4. Monitor workflow execution
5. Expected: All checks pass ✅

---

## 📊 **Smoke Test Checklist**

| Test | Command | Expected | Status |
|------|---------|----------|--------|
| Build | `npm run build` | No errors, dist/ created | ⏳ |
| DB Tables | SQL query | Tables exist, RLS policies active | ⏳ |
| 2FA Functions | `supabase functions list` | All 3 functions deployed | ⏳ |
| Generate Setup | cURL POST | Returns secret + QR code | ⏳ |
| Git Status | `git status` | Working tree clean | ⏳ |
| Remote Sync | `git log -1` | Latest commit from origin | ⏳ |
| CI/CD | Create PR | Workflows trigger & pass | ⏳ |

---

## 🔍 **Troubleshooting**

### **Issue: Supabase CLI not found**

```bash
# Install globally
npm install -g @supabase/cli

# Or install locally
npm install @supabase/cli

# Then use
npx supabase --version
```

### **Issue: Migration already applied**

```bash
# Check status
supabase migration list

# If already applied, that's okay! No action needed.
```

### **Issue: 2FA function deployment fails**

```bash
# Check Supabase CLI is logged in
supabase projects list

# Check project is linked
supabase projects link --project-ref rkedhwwukehxdpofbxki

# Check function syntax
deno lint supabase/functions/generate-2fa-setup/index.ts

# Deploy with verbose logging
supabase functions deploy generate-2fa-setup --project-ref rkedhwwukehxdpofbxki --debug
```

### **Issue: GitHub secrets not working**

```bash
# Verify secrets are set
# Go to: https://github.com/erasukarno87/chaolong-production/settings/secrets/actions

# Check secret names match workflow file
# cat .github/workflows/deploy-production.yml | grep secrets

# Re-run workflow
# Go to Actions tab → failed workflow → Re-run jobs
```

---

## ✨ **Next Steps After Smoke Tests**

Once all smoke tests pass ✅:

1. **Monitor CI/CD Pipeline**
   - Set up GitHub Actions notifications
   - Check for any failures

2. **Test Production Deployment**
   - Trigger deployment from main branch
   - Monitor Netlify/Vercel deployment
   - Verify application loads

3. **Test 2FA Flow**
   - Setup 2FA for test user
   - Test login with 2FA
   - Test backup codes

4. **Go-Live Checklist**
   - [ ] All smoke tests passing
   - [ ] CI/CD pipeline working
   - [ ] Monitoring active (Sentry)
   - [ ] Team trained
   - [ ] Runbook ready

---

## 📞 **Support Resources**

| Tool | Docs | Link |
|------|------|------|
| Supabase CLI | Setup & Deploy | https://supabase.com/docs/guides/cli |
| GitHub Actions | Workflows | https://docs.github.com/en/actions |
| Netlify | Deployment | https://docs.netlify.com/cli/get-started/ |
| Vercel | Deployment | https://vercel.com/docs/cli |

---

## 🎯 **Estimated Timeline**

| Task | Est. Time | Dependencies |
|------|-----------|--------------|
| Add GitHub Secrets | 15 min | GitHub account |
| Install Supabase CLI | 5 min | npm/Node.js |
| Apply DB Migration | 5 min | Supabase linked |
| Deploy 2FA Functions | 10 min | Migration applied |
| Run Smoke Tests | 20 min | All above |
| **Total** | **~55 min** | - |

---

**Status:** Ready to execute! All tasks documented and ready. 🚀
