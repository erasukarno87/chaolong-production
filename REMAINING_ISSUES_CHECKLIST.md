# 📋 Remaining Issues Checklist

**Project:** PT. Chao Long Motor Parts Indonesia - Production System  
**Date:** January 2025  
**Status:** Post-Critical Fixes  
**Overall Completion:** 95%

---

## 🎯 Executive Summary

**Critical Issues:** ✅ 0 (All Resolved)  
**High Priority:** ⚠️ 3 items  
**Medium Priority:** 🟡 6 items  
**Low Priority:** 🔵 5 items  

**Estimated Time to 100% Production Ready:** 1-2 days (High Priority only)

---

## 🔴 High Priority (Must Complete Before Production)

### 1. Deploy Supabase Edge Functions for 2FA

**Status:** ❌ Not Started  
**Priority:** 🔴 Critical  
**Estimated Time:** 2-3 hours  
**Assigned To:** Backend Team  
**Blocking:** 2FA functionality

**Required Functions:**

#### a. generate-2fa-setup
```typescript
// supabase/functions/generate-2fa-setup/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import * as OTPAuth from 'npm:otpauth@9.1.4'

serve(async (req) => {
  const { userId, email } = await req.json()
  
  // Generate secret
  const secret = new OTPAuth.Secret({ size: 20 })
  
  // Generate TOTP
  const totp = new OTPAuth.TOTP({
    issuer: 'Chao Long Production',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret,
  })
  
  // Generate QR code URL
  const qrCodeUrl = totp.toString()
  
  // Generate backup codes
  const backupCodes = Array.from({ length: 10 }, () => 
    Math.random().toString(36).substring(2, 10).toUpperCase()
  )
  
  return new Response(
    JSON.stringify({
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

#### b. verify-2fa-setup
```typescript
// Verify TOTP code during setup
```

#### c. verify-2fa-code
```typescript
// Verify TOTP code during login
```

#### d. verify-2fa-backup-code
```typescript
// Verify and mark backup code as used
```

#### e. regenerate-backup-codes
```typescript
// Generate new backup codes
```

**Deployment Steps:**
```bash
# 1. Create functions
cd supabase/functions
mkdir generate-2fa-setup verify-2fa-setup verify-2fa-code verify-2fa-backup-code regenerate-backup-codes

# 2. Write function code (see above)

# 3. Deploy to Supabase
supabase functions deploy generate-2fa-setup
supabase functions deploy verify-2fa-setup
supabase functions deploy verify-2fa-code
supabase functions deploy verify-2fa-backup-code
supabase functions deploy regenerate-backup-codes

# 4. Test functions
curl -X POST https://your-project.supabase.co/functions/v1/generate-2fa-setup \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-id","email":"test@example.com"}'
```

**Acceptance Criteria:**
- [ ] All 5 functions deployed successfully
- [ ] Functions return expected responses
- [ ] Error handling implemented
- [ ] Rate limiting configured
- [ ] Tested with real authenticator app

---

### 2. Configure Sentry for Production Error Tracking

**Status:** ❌ Not Started  
**Priority:** 🔴 Critical  
**Estimated Time:** 1 hour  
**Assigned To:** DevOps Team  
**Blocking:** Production error monitoring

**Steps:**

1. **Create Sentry Project**
   - Go to https://sentry.io
   - Create new project
   - Select "React" as platform
   - Copy DSN

2. **Add DSN to Environment Variables**
   ```env
   VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   ```

3. **Install Sentry SDK**
   ```bash
   npm install @sentry/react
   ```

4. **Configure Alerting Rules**
   - Set up email alerts for errors
   - Configure Slack integration
   - Set up error thresholds

5. **Test Error Tracking**
   ```typescript
   // Trigger test error
   import { captureError } from '@/lib/monitoring/errorTracking';
   captureError(new Error('Test error'), 'error');
   ```

**Acceptance Criteria:**
- [ ] Sentry project created
- [ ] DSN configured in production
- [ ] Test error appears in Sentry dashboard
- [ ] Alerting rules configured
- [ ] Team members added to project

---

### 3. Implement Session Timeout (30 minutes idle)

**Status:** ❌ Not Started  
**Priority:** 🔴 Critical  
**Estimated Time:** 2 hours  
**Assigned To:** Frontend Team  
**Blocking:** Security compliance

**Implementation:**

```typescript
// src/hooks/useSessionTimeout.ts
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout

export function useSessionTimeout() {
  const { signOut, user } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    if (!user) return;

    // Show warning 5 minutes before timeout
    warningRef.current = setTimeout(() => {
      toast.warning('Your session will expire in 5 minutes due to inactivity', {
        duration: 5000,
        action: {
          label: 'Stay Logged In',
          onClick: () => resetTimer(),
        },
      });
    }, IDLE_TIMEOUT - WARNING_TIME);

    // Auto logout after timeout
    timeoutRef.current = setTimeout(() => {
      toast.error('Session expired due to inactivity');
      signOut();
    }, IDLE_TIMEOUT);
  };

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [user]);
}
```

**Usage in App.tsx:**
```typescript
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

function App() {
  useSessionTimeout();
  // ... rest of app
}
```

**Acceptance Criteria:**
- [ ] Session expires after 30 minutes of inactivity
- [ ] Warning shown 5 minutes before expiration
- [ ] User can extend session by clicking "Stay Logged In"
- [ ] Any user activity resets the timer
- [ ] Works across all pages

---

## 🟡 Medium Priority (Post-Launch, Within 2 Weeks)

### 4. E2E Tests with Playwright

**Status:** ❌ Not Started  
**Priority:** 🟡 Medium  
**Estimated Time:** 1 week  
**Assigned To:** QA Team

**Setup:**
```bash
npm install -D @playwright/test
npx playwright install
```

**Test Cases to Implement:**
- [ ] Complete login flow
- [ ] Production setup flow (Step 1-4)
- [ ] Shift run creation
- [ ] Hourly output entry
- [ ] NG entry
- [ ] Downtime entry
- [ ] End of shift report
- [ ] 2FA setup flow
- [ ] Admin user management

**Example Test:**
```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('user can login successfully', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('http://localhost:5173/');
  await expect(page.locator('text=Welcome')).toBeVisible();
});
```

---

### 5. PWA Support (Progressive Web App)

**Status:** ❌ Not Started  
**Priority:** 🟡 Medium  
**Estimated Time:** 3-4 days  
**Assigned To:** Frontend Team

**Implementation Steps:**

1. **Create PWA Manifest**
```json
// public/manifest.json
{
  "name": "Chao Long Production System",
  "short_name": "CL Production",
  "description": "Manufacturing production monitoring system",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

2. **Create Service Worker**
```typescript
// public/sw.js
const CACHE_NAME = 'cl-production-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

3. **Register Service Worker**
```typescript
// src/main.tsx
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}
```

**Acceptance Criteria:**
- [ ] PWA manifest created
- [ ] Service worker implemented
- [ ] Offline fallback page
- [ ] Install prompt working
- [ ] Works on mobile devices
- [ ] Lighthouse PWA score > 90

---

### 6. Security Headers Configuration

**Status:** ❌ Not Started  
**Priority:** 🟡 Medium  
**Estimated Time:** 1 day  
**Assigned To:** DevOps Team

**Headers to Configure:**

```nginx
# netlify.toml or vercel.json
[[headers]]
  for = "/*"
  [headers.values]
    # Content Security Policy
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.sentry.io"
    
    # Strict Transport Security
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    
    # X-Frame-Options
    X-Frame-Options = "DENY"
    
    # X-Content-Type-Options
    X-Content-Type-Options = "nosniff"
    
    # X-XSS-Protection
    X-XSS-Protection = "1; mode=block"
    
    # Referrer-Policy
    Referrer-Policy = "strict-origin-when-cross-origin"
    
    # Permissions-Policy
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
```

**Testing:**
```bash
# Test security headers
curl -I https://your-domain.com

# Or use online tools
# https://securityheaders.com
# https://observatory.mozilla.org
```

**Acceptance Criteria:**
- [ ] All security headers configured
- [ ] CSP policy tested and working
- [ ] HSTS enabled
- [ ] Security headers score A+
- [ ] No console errors from CSP

---

### 7. Database Migration for 2FA Settings Table

**Status:** ❌ Not Started  
**Priority:** 🟡 Medium  
**Estimated Time:** 1 hour  
**Assigned To:** Database Team

**Migration File:**
```sql
-- supabase/migrations/20260115000001_add_2fa_settings.sql

-- Create user_2fa_settings table
CREATE TABLE IF NOT EXISTS public.user_2fa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  secret_encrypted TEXT NOT NULL,
  backup_codes_encrypted TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_2fa_settings_user_id_key UNIQUE(user_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_2fa_settings_user_id 
  ON public.user_2fa_settings(user_id);

-- Enable RLS
ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own 2FA settings"
  ON public.user_2fa_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own 2FA settings"
  ON public.user_2fa_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own 2FA settings"
  ON public.user_2fa_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_user_2fa_settings_updated_at
  BEFORE UPDATE ON public.user_2fa_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.user_2fa_settings IS 'Stores two-factor authentication settings for users';
```

**Deployment:**
```bash
supabase db push
```

**Acceptance Criteria:**
- [ ] Migration file created
- [ ] Table created successfully
- [ ] RLS policies working
- [ ] Indexes created
- [ ] Tested with sample data

---

### 8. Add CAPTCHA for Login (Optional)

**Status:** ❌ Not Started  
**Priority:** 🟡 Medium  
**Estimated Time:** 2 hours  
**Assigned To:** Frontend Team

**Implementation with hCaptcha:**

```bash
npm install @hcaptcha/react-hcaptcha
```

```typescript
// src/components/auth/LoginForm.tsx
import HCaptcha from '@hcaptcha/react-hcaptcha';

function LoginForm() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!captchaToken) {
      toast.error('Please complete the CAPTCHA');
      return;
    }
    
    // Proceed with login
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... email and password fields ... */}
      
      <HCaptcha
        sitekey="your-hcaptcha-site-key"
        onVerify={handleCaptchaVerify}
      />
      
      <button type="submit">Sign In</button>
    </form>
  );
}
```

**Acceptance Criteria:**
- [ ] CAPTCHA appears on login form
- [ ] Login blocked without CAPTCHA
- [ ] CAPTCHA verified on backend
- [ ] Works on mobile devices
- [ ] Accessible for screen readers

---

### 9. Implement Audit Log Viewer

**Status:** ❌ Not Started  
**Priority:** 🟡 Medium  
**Estimated Time:** 3 days  
**Assigned To:** Frontend Team

**Features:**
- View all system changes
- Filter by user, table, action, date
- Export audit logs
- Search functionality

**Acceptance Criteria:**
- [ ] Audit log viewer page created
- [ ] Filtering works correctly
- [ ] Export to CSV/Excel
- [ ] Pagination implemented
- [ ] Only accessible to super_admin

---

## 🔵 Low Priority (Future Enhancements)

### 10. CDN Configuration

**Status:** ❌ Not Started  
**Priority:** 🔵 Low  
**Estimated Time:** 1 day  
**Assigned To:** DevOps Team

**Options:**
- CloudFlare
- Fastly
- AWS CloudFront

**Benefits:**
- Faster asset delivery
- Reduced server load
- Better global performance

---

### 11. Advanced Analytics Dashboard

**Status:** ❌ Not Started  
**Priority:** 🔵 Low  
**Estimated Time:** 2 weeks  
**Assigned To:** Frontend Team

**Features:**
- User behavior tracking
- Performance analytics
- Custom reports
- Predictive analytics

---

### 12. Mobile App (React Native)

**Status:** ❌ Not Started  
**Priority:** 🔵 Low  
**Estimated Time:** 2-3 months  
**Assigned To:** Mobile Team

**Features:**
- Native mobile experience
- Offline support
- Push notifications
- Camera integration

---

### 13. Internationalization (i18n)

**Status:** ❌ Not Started  
**Priority:** 🔵 Low  
**Estimated Time:** 1 week  
**Assigned To:** Frontend Team

**Languages:**
- Indonesian (primary)
- English
- Chinese (optional)

---

### 14. Dark Mode

**Status:** ❌ Not Started  
**Priority:** 🔵 Low  
**Estimated Time:** 2 days  
**Assigned To:** Frontend Team

**Implementation:**
- Already has next-themes installed
- Need to add dark mode variants to components
- Add theme toggle in settings

---

## 📊 Progress Tracking

### Overall Progress: 95%

```
█████████████████████████████████████████████████░░░░░ 95%
```

### By Priority:

**High Priority:** 0/3 (0%)  
```
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%
```

**Medium Priority:** 0/6 (0%)  
```
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%
```

**Low Priority:** 0/5 (0%)  
```
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%
```

---

## 🎯 Recommended Action Plan

### Week 1 (High Priority)
**Goal:** Complete all high-priority items

**Day 1-2:**
- [ ] Deploy Supabase Edge Functions
- [ ] Test 2FA functionality end-to-end

**Day 3:**
- [ ] Configure Sentry
- [ ] Test error tracking
- [ ] Set up alerting

**Day 4:**
- [ ] Implement session timeout
- [ ] Test timeout functionality

**Day 5:**
- [ ] Final testing
- [ ] Deploy to production
- [ ] Monitor for issues

### Week 2-3 (Medium Priority)
**Goal:** Complete medium-priority items

- [ ] E2E tests
- [ ] PWA support
- [ ] Security headers
- [ ] 2FA database migration
- [ ] CAPTCHA (optional)
- [ ] Audit log viewer

### Month 2+ (Low Priority)
**Goal:** Future enhancements

- [ ] CDN configuration
- [ ] Advanced analytics
- [ ] Mobile app planning
- [ ] Internationalization
- [ ] Dark mode

---

## 📞 Contact & Escalation

**For Questions:**
- Technical Issues: Database Team Lead
- Deployment Issues: DevOps Manager
- Security Issues: Security Team
- Priority Changes: Project Manager

**Escalation Path:**
1. Team Lead
2. Engineering Manager
3. CTO

---

## ✅ Definition of Done

An item is considered "Done" when:

- [ ] Code implemented and reviewed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] QA tested and approved
- [ ] Deployed to production
- [ ] Monitored for 24 hours
- [ ] No critical issues reported

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Next Review:** Weekly until all high-priority items complete

---

*This checklist will be updated as items are completed. Check back regularly for progress updates.*