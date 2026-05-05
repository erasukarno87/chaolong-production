# 🚀 Deployment Guide - Production System Chaolong

Panduan lengkap untuk deploy aplikasi ke Vercel dan Netlify.

---

## 📋 Prerequisites

- ✅ GitHub repository: https://github.com/erasukarno01/c-pro.git
- ✅ Supabase project dengan URL dan Anon Key
- ✅ Account Vercel atau Netlify

---

## 🔷 VERCEL DEPLOYMENT

### Method 1: Deploy via Vercel Dashboard (Recommended)

#### Step 1: Import Project
1. Login ke [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import dari GitHub: `erasukarno01/c-pro`
4. Click **"Import"**

#### Step 2: Configure Project
```
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

#### Step 3: Environment Variables
Tambahkan di **"Environment Variables"** section:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

**Important:** 
- Gunakan nilai dari Supabase project Anda
- Jangan gunakan quotes
- Apply untuk semua environments (Production, Preview, Development)

#### Step 4: Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes
3. Your app will be live at: `https://c-pro.vercel.app`

---

### Method 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: c-pro
# - Directory: ./
# - Override settings? No

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY

# Deploy to production
vercel --prod
```

---

## 🟢 NETLIFY DEPLOYMENT

### Method 1: Deploy via Netlify Dashboard (Recommended)

#### Step 1: Import Project
1. Login ke [Netlify Dashboard](https://app.netlify.com/)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"GitHub"**
4. Select repository: `erasukarno01/c-pro`
5. Click **"Deploy"**

#### Step 2: Configure Build Settings
```
Build command: npm run build
Publish directory: dist
Branch to deploy: main
```

#### Step 3: Environment Variables
1. Go to **Site settings** → **Environment variables**
2. Click **"Add a variable"**
3. Add:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

#### Step 4: Redeploy
1. Go to **Deploys** tab
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Wait 2-3 minutes
4. Your app will be live at: `https://c-pro.netlify.app`

---

### Method 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize
netlify init

# Follow prompts:
# - Create & configure a new site
# - Team: Your team
# - Site name: c-pro
# - Build command: npm run build
# - Publish directory: dist

# Add environment variables
netlify env:set VITE_SUPABASE_URL "https://your-project.supabase.co"
netlify env:set VITE_SUPABASE_PUBLISHABLE_KEY "your-anon-key-here"

# Deploy
netlify deploy --prod
```

---

## 🔐 Environment Variables Setup

### Get Supabase Credentials

1. Login ke [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`

### Add to Vercel

```bash
# Via CLI
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production

# Or via Dashboard:
# Settings → Environment Variables → Add
```

### Add to Netlify

```bash
# Via CLI
netlify env:set VITE_SUPABASE_URL "your-url"
netlify env:set VITE_SUPABASE_PUBLISHABLE_KEY "your-key"

# Or via Dashboard:
# Site settings → Environment variables → Add a variable
```

---

## ✅ Post-Deployment Checklist

### 1. Verify Deployment

- [ ] Site loads without errors
- [ ] Login page accessible
- [ ] Can connect to Supabase
- [ ] No console errors
- [ ] Environment variables working

### 2. Test Core Features

- [ ] User authentication works
- [ ] Data fetching from Supabase
- [ ] Forms submission
- [ ] Navigation between pages
- [ ] Mobile responsive

### 3. Performance Check

```bash
# Run Lighthouse audit
# Chrome DevTools → Lighthouse → Generate report

Target scores:
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+
```

### 4. Security Check

- [ ] HTTPS enabled (automatic on Vercel/Netlify)
- [ ] Environment variables not exposed in client
- [ ] No secrets in console logs
- [ ] CSP headers configured (Netlify only)

---

## 🔄 Continuous Deployment

Both Vercel and Netlify automatically deploy when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Automatic deployment triggered!
# Vercel: ~2-3 minutes
# Netlify: ~2-3 minutes
```

---

## 🌐 Custom Domain Setup

### Vercel

1. Go to **Settings** → **Domains**
2. Add your domain: `yourdomain.com`
3. Follow DNS configuration instructions
4. Wait for DNS propagation (5-60 minutes)

### Netlify

1. Go to **Domain settings** → **Add custom domain**
2. Enter your domain: `yourdomain.com`
3. Follow DNS configuration instructions
4. Enable HTTPS (automatic)

---

## 🐛 Troubleshooting

### Build Fails

**Problem:** Build command fails

**Solution:**
```bash
# Test build locally first
npm run build

# Check for errors
# Fix issues
# Push to GitHub
```

### Environment Variables Not Working

**Problem:** App can't connect to Supabase

**Solution:**
1. Verify variables are set correctly
2. Check variable names (must start with `VITE_`)
3. Redeploy after adding variables
4. Check browser console for errors

### 404 on Refresh

**Problem:** Page not found when refreshing

**Solution:**
- ✅ Already configured in `vercel.json` and `netlify.toml`
- Rewrites handle SPA routing

### Slow Performance

**Problem:** Site loads slowly

**Solution:**
```bash
# Analyze bundle size
npm run build

# Check dist/ folder size
# Optimize images
# Enable caching (already configured)
```

---

## 📊 Deployment Comparison

| Feature | Vercel | Netlify |
|---------|--------|----------|
| **Build Time** | ~2-3 min | ~2-3 min |
| **Free Tier** | 100 GB bandwidth | 100 GB bandwidth |
| **Custom Domain** | ✅ Free SSL | ✅ Free SSL |
| **Auto Deploy** | ✅ On push | ✅ On push |
| **Preview Deploys** | ✅ Per PR | ✅ Per PR |
| **Edge Functions** | ✅ Yes | ✅ Yes |
| **Analytics** | ✅ Built-in | ✅ Built-in |
| **Best For** | Next.js, Vite | Static sites, Vite |

**Recommendation:** Both excellent! Choose based on preference.

---

## 🎯 Production Checklist

Before going live:

### Code
- [ ] All ESLint warnings fixed
- [ ] No console.log in production
- [ ] Error boundaries implemented
- [ ] Loading states for all async operations

### Security
- [ ] Environment variables configured
- [ ] No secrets in code
- [ ] HTTPS enabled
- [ ] CSP headers configured

### Performance
- [ ] Images optimized
- [ ] Code splitting enabled
- [ ] Lazy loading implemented
- [ ] Bundle size < 500KB

### Testing
- [ ] All features tested
- [ ] Mobile responsive verified
- [ ] Cross-browser tested
- [ ] Accessibility checked

### Monitoring
- [ ] Error tracking setup (Sentry)
- [ ] Analytics configured (Google Analytics)
- [ ] Performance monitoring
- [ ] Uptime monitoring

---

## 📞 Support

### Vercel
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support
- Community: https://github.com/vercel/vercel/discussions

### Netlify
- Docs: https://docs.netlify.com
- Support: https://www.netlify.com/support
- Community: https://answers.netlify.com

---

## 🚀 Quick Deploy Commands

### Vercel
```bash
# One-time setup
npm install -g vercel
vercel login
vercel

# Future deploys
vercel --prod
```

### Netlify
```bash
# One-time setup
npm install -g netlify-cli
netlify login
netlify init

# Future deploys
netlify deploy --prod
```

---

**Last Updated:** 2025-01-XX  
**Repository:** https://github.com/erasukarno01/c-pro.git  
**Status:** ✅ Ready for deployment
