# ⚠️ SUPABASE CLI Installation Guide

**Issue:** Supabase CLI no longer supports global npm installation  
**Solution:** Use alternative package managers or direct binary download

---

## 🚀 **Option 1: Install Scoop (Recommended for Windows) - 2 Minutes**

Scoop is a command-line package manager for Windows. Easiest solution!

### Step 1: Enable PowerShell Script Execution
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Press `Y` when prompted.

### Step 2: Install Scoop
```powershell
iwr -useb get.scoop.sh | iex
```

**Expected output:**
```
Scoop was installed successfully!
```

### Step 3: Install Supabase CLI
```powershell
scoop install supabase
```

### Step 4: Verify Installation
```powershell
supabase --version
```

**Expected output:**
```
supabase 1.x.x or newer
```

---

## 🔧 **Option 2: Install Chocolatey (Alternative) - 3 Minutes**

If you prefer Chocolatey (another popular Windows package manager):

### Step 1: Install Chocolatey
Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### Step 2: Install Supabase CLI
```powershell
choco install supabase-cli
```

### Step 3: Verify
```powershell
supabase --version
```

---

## 📥 **Option 3: Direct Binary Download (No Package Manager)**

Download Supabase CLI executable directly from GitHub releases:

### Step 1: Download Binary
Go to: https://github.com/supabase/cli/releases

Look for the latest release and download:
- `supabase-<version>_windows_amd64.zip` (for 64-bit Windows)
- or `supabase-<version>_windows_386.zip` (for 32-bit Windows)

### Step 2: Extract and Setup
1. Extract the ZIP file
2. Move `supabase.exe` to a folder in your PATH, e.g.:
   ```
   C:\Program Files\supabase\
   ```

3. Add to PATH (if not using a standard location):
   - Press `Win + X` → System
   - Advanced system settings → Environment Variables
   - Edit `PATH` and add the folder containing `supabase.exe`

### Step 3: Verify
Open new PowerShell and run:
```powershell
supabase --version
```

---

## 🎯 **Quick Reference: Installation Commands**

| Method | Command | Time | Pros |
|--------|---------|------|------|
| **Scoop** ⭐ | `scoop install supabase` | 2 min | Easiest, auto-updates |
| **Chocolatey** | `choco install supabase-cli` | 3 min | Popular alternative |
| **Direct Binary** | Manual download + PATH | 5 min | No package manager needed |

---

## ✅ **Recommended Path**

1. **Install Scoop** (one-time setup, takes 30 seconds):
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
   iwr -useb get.scoop.sh | iex
   ```

2. **Install Supabase**:
   ```powershell
   scoop install supabase
   ```

3. **Verify**:
   ```powershell
   supabase --version
   ```

That's it! ✅

---

## 🆘 **Troubleshooting**

### Issue: "PowerShell execution policy" error
**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: "scoop command not found" after installation
**Solution:** Close and reopen PowerShell, or run:
```powershell
$profile
# Edit the profile file if needed
```

### Issue: Still can't find supabase after installation
**Solution:** Verify installation:
```powershell
# For Scoop
scoop list | findstr supabase

# For Chocolatey
choco list -l | findstr supabase

# Or check PATH
$ENV:PATH -split ';' | findstr supabase
```

---

## 📚 **Official Resources**

- **Supabase CLI GitHub:** https://github.com/supabase/cli#install-the-cli
- **Scoop Documentation:** https://scoop.sh/
- **Chocolatey Documentation:** https://chocolatey.org/

---

## ✨ **What's Next After Installation?**

Once Supabase CLI is installed, run:

```bash
cd C:\prod-system-chaolong
supabase login
supabase link --project-ref rkedhwwukehxdpofbxki
supabase migration up
supabase functions deploy generate-2fa-setup --project-ref rkedhwwukehxdpofbxki
supabase functions deploy verify-2fa-setup --project-ref rkedhwwukehxdpofbxki
supabase functions deploy verify-2fa-code --project-ref rkedhwwukehxdpofbxki
```

Or use the automated script:
```bash
.\Deploy.ps1
```

---

**Status:** Ready to install Supabase CLI! Choose your preferred method above. 🚀
