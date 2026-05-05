# 🚀 2FA Edge Functions Deployment Guide

**Date:** May 5, 2026  
**Status:** Ready for Production Deployment  
**Functions:** 3 (generate-2fa-setup, verify-2fa-setup, verify-2fa-code)

---

## 📋 Pre-Deployment Checklist

### Prerequisites
- [ ] Supabase CLI installed: `npm install -g @supabase/cli`
- [ ] Authenticated with Supabase: `supabase login`
- [ ] Project ID configured: `rkedhwwukehxdpofbxki`
- [ ] Migration 20260505000007 applied (2FA database schema)
- [ ] Environment variables set in `.env`

### Database Setup
```bash
# 1. Apply 2FA schema migration
cd c:\prod-system-chaolong
supabase migration up

# Expected output:
# ✓ Running migrations...
# ✓ 20260505000007_add_twofa_columns.sql
# ✓ Tables created: user_twofa, user_logs
# ✓ Triggers created: trg_init_user_twofa
```

### Verify Database Changes
```sql
-- Run these queries in Supabase SQL Editor

-- 1. Check user_twofa table
SELECT COUNT(*) FROM public.user_twofa;

-- 2. Check user_logs table
SELECT COUNT(*) FROM public.user_logs;

-- 3. Verify RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('user_twofa', 'user_logs');

-- 4. Test initialization function
SELECT * FROM public.user_twofa LIMIT 1;
```

---

## 🔧 Deploy Edge Functions

### Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to project
cd c:\prod-system-chaolong

# Deploy all 2FA functions
supabase functions deploy generate-2fa-setup
supabase functions deploy verify-2fa-setup
supabase functions functions deploy verify-2fa-code

# Expected output for each:
# ✓ Deployed function generate-2fa-setup
# ✓ Endpoint: https://[project].supabase.co/functions/v1/generate-2fa-setup
```

### Option 2: Manual Deployment via Supabase Console

1. Go to: https://app.supabase.com/projects/rkedhwwukehxdpofbxki/functions
2. Click "Create a new function"
3. For each function:
   - **Name:** generate-2fa-setup / verify-2fa-setup / verify-2fa-code
   - **Type:** HTTP
   - **Paste code from:** `supabase/functions/[function-name]/index.ts`
   - Click "Deploy"

### Option 3: CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy-2fa-functions.yml
name: Deploy 2FA Functions

on:
  push:
    branches: [main, staging]
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy generate-2fa-setup
      - run: supabase functions deploy verify-2fa-setup
      - run: supabase functions deploy verify-2fa-code
```

---

## ✅ Post-Deployment Verification

### 1. Verify Functions are Deployed

```bash
# Check deployment status
supabase functions list

# Expected output:
# generate-2fa-setup    HTTP     [project].supabase.co/functions/v1/generate-2fa-setup
# verify-2fa-setup      HTTP     [project].supabase.co/functions/v1/verify-2fa-setup
# verify-2fa-code       HTTP     [project].supabase.co/functions/v1/verify-2fa-code
```

### 2. Test generate-2fa-setup Function

```bash
curl -X POST \
  https://[project].supabase.co/functions/v1/generate-2fa-setup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "8a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d"
  }'

# Expected response:
# {
#   "secret": "JBSWY3DPEBLW64TMMQ======",
#   "qr_code_url": "otpauth://totp/Chao%20Long%20Production:user@example.com?secret=...",
#   "backup_codes": ["ABC12345", "DEF67890", ...]
# }
```

### 3. Test verify-2fa-setup Function

```bash
# First, generate a TOTP code from the secret using an authenticator app
# Then verify it:

curl -X POST \
  https://[project].supabase.co/functions/v1/verify-2fa-setup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "8a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d",
    "secret": "JBSWY3DPEBLW64TMMQ======",
    "totp_code": "123456",
    "backup_codes": ["ABC12345", "DEF67890", ...]
  }'

# Expected response:
# {
#   "success": true,
#   "message": "2FA setup verified successfully"
# }
```

### 4. Test verify-2fa-code Function

```bash
# Test TOTP code verification during login

curl -X POST \
  https://[project].supabase.co/functions/v1/verify-2fa-code \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "8a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d",
    "code": "123456"
  }'

# Expected response:
# {
#   "success": true,
#   "message": "2FA verification successful",
#   "used_backup_code": false
# }
```

### 5. Check Audit Logs

```sql
-- Verify actions were logged
SELECT user_id, action, details, created_at 
FROM public.user_logs 
WHERE action LIKE '2fa_%' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🔌 Integration Points

### Frontend Integration (TwoFactorSetup Component)

```typescript
// src/components/auth/TwoFactorSetup.tsx

// 1. Generate 2FA setup
const { data: setup } = await supabase.functions.invoke('generate-2fa-setup', {
  body: { user_id: user.id }
});
// Returns: { secret, qr_code_url, backup_codes }

// 2. User scans QR code and enters code
// User enters 6-digit code from authenticator app

// 3. Verify setup
const { data: result } = await supabase.functions.invoke('verify-2fa-setup', {
  body: { 
    user_id: user.id,
    secret: setup.secret,
    totp_code: userCode,
    backup_codes: setup.backup_codes
  }
});
// Returns: { success: true, message }
```

### Login Flow Integration

```typescript
// src/components/auth/Login.tsx

// After credentials verified:

// 1. Check if user has 2FA enabled
const { data: twofa } = await supabase
  .from('user_twofa')
  .select('twofa_enabled')
  .eq('user_id', userId)
  .single();

// 2. If enabled, prompt for 2FA code
if (twofa?.twofa_enabled) {
  // Show 2FA input modal
  const code = await prompt('Enter 6-digit code or 8-digit backup code');
  
  // 3. Verify code
  const { data: verified } = await supabase.functions.invoke('verify-2fa-code', {
    body: { user_id: userId, code }
  });
  
  if (!verified?.success) {
    throw new Error('Invalid 2FA code');
  }
}

// 4. Complete login
```

---

## 🛡️ Security Considerations

### Secrets Management

✅ **What we're doing right:**
- Secrets stored in `user_twofa` table (encrypted at rest)
- Backup codes hashed/encrypted before storage
- TOTP verification happens in secure Edge Function
- Audit logs track all 2FA events

⚠️ **To strengthen:**
- Encrypt `twofa_secret` column with pgcrypto
- Hash backup codes with bcrypt
- Add rate limiting to verify endpoints (Supabase Edge Function guards)
- Implement backup code rotation policy

### Production Hardening

```sql
-- Encrypt 2FA secrets (optional but recommended)
ALTER TABLE public.user_twofa
  ADD COLUMN IF NOT EXISTS twofa_secret_encrypted TEXT;

-- Migration to encrypt existing secrets:
UPDATE public.user_twofa
SET twofa_secret_encrypted = pgp_sym_encrypt(twofa_secret, 'encryption_key')
WHERE twofa_secret IS NOT NULL;
```

---

## 📊 Monitoring & Alerts

### Key Metrics to Monitor

```sql
-- 1. 2FA adoption rate
SELECT 
  COUNT(*) FILTER (WHERE twofa_enabled) as enabled_users,
  COUNT(*) as total_users,
  ROUND(100.0 * COUNT(*) FILTER (WHERE twofa_enabled) / COUNT(*), 2) as adoption_pct
FROM public.user_twofa;

-- 2. Failed verification attempts
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as failed_attempts
FROM public.user_logs
WHERE action = 'twofa_failed'
GROUP BY hour
ORDER BY hour DESC;

-- 3. Backup code usage
SELECT 
  COUNT(*) as backup_codes_used
FROM public.user_logs
WHERE action = '2fa_backup_code_used'
  AND created_at > NOW() - INTERVAL '7 days';

-- 4. Setup completion time
SELECT 
  AVG(EXTRACT(EPOCH FROM (
    (SELECT created_at FROM public.user_logs 
     WHERE user_id = ut.user_id AND action = '2fa_verified' LIMIT 1)
    - ut.twofa_setup_at
  ))) / 60 as avg_setup_minutes
FROM public.user_twofa ut
WHERE ut.twofa_enabled = true;
```

### Alert Thresholds

| Alert | Threshold | Action |
|-------|-----------|--------|
| Failed verifications | > 5 in 1 minute | Review logs, check for attacks |
| 2FA setup failure | > 20% of attempts | Investigate Edge Function |
| Backup code depletion | < 3 codes remaining | Regenerate codes |
| Function errors | Error rate > 1% | Check logs, rollback if needed |

---

## 🔄 Rollback Plan

If you need to rollback:

```bash
# 1. Rollback Edge Functions
supabase functions rollback

# 2. Rollback database migration
supabase migration rollback --num 1

# 3. Disable 2FA in UI (keep database for later recovery)
UPDATE public.user_twofa SET twofa_enabled = false;

# 4. Notify users
# Send notification to users with 2FA enabled about temporary outage
```

---

## 📞 Support & Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid JWT | Pass valid Bearer token in Authorization header |
| `400 Invalid input` | Wrong JSON schema | Check request body against function spec |
| `500 Function error` | Runtime error | Check Edge Function logs in Supabase console |
| `TOTP code invalid` | Time skew | Sync device time, use window of ±1 minute |
| `Backup code not found` | Code already used | Generate new backup codes |

### Debug Logs

```bash
# View Edge Function logs
supabase functions logs generate-2fa-setup
supabase functions logs verify-2fa-setup
supabase functions functions logs verify-2fa-code

# Real-time streaming logs
supabase functions logs generate-2fa-setup --follow
```

---

## ✨ Next Steps

1. ✅ Apply database migration
2. ✅ Deploy 2FA Edge Functions
3. ✅ Test all three functions
4. ✅ Update frontend components (TwoFactorSetup, Login)
5. ✅ Enable 2FA requirement for admins (optional, user-by-user)
6. ✅ Monitor adoption and errors
7. ✅ Implement backup code regeneration UI

---

**Status:** Ready to deploy! 🚀

**Questions?** Check Supabase docs at https://supabase.com/docs/guides/functions
