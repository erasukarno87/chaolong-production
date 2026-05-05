# 🔐 Cara Mendapatkan SUPABASE_ACCESS_TOKEN

**Pertanyaan:** Dimana saya bisa mendapatkan SUPABASE_ACCESS_TOKEN?  
**Jawaban:** Dari halaman Account Settings di Supabase Dashboard

---

## 📋 **Langkah-Langkah (Step-by-Step)**

### **Step 1: Buka Supabase Dashboard**

Pergi ke: https://app.supabase.com/account/tokens

(Atau: Supabase Dashboard → Account Settings → Tokens)

---

### **Step 2: Lihat Token yang Sudah Ada**

Di halaman tersebut, Anda akan melihat:
- List token yang sudah dibuat sebelumnya
- Token yang baru saja Anda buat dengan nama `chaolong-production-deploy`

---

### **Step 3: Copy Token Value**

1. Cari token dengan nama `chaolong-production-deploy`
2. Klik icon **"Copy"** atau **"Show"**
3. Copy seluruh nilai token (panjang string yang dimulai dengan `sbp_...` atau `sb...`)

---

## ✅ **Format Token**

Token Supabase Access Token biasanya terlihat seperti:

```
sbp_1234567890abcdef1234567890abcdef
```

atau

```
sb_access_token_1234567890abcdef1234567890abcdef
```

---

## 🎯 **Untuk GitHub Secrets**

Setelah copy token dari Supabase:

1. Buka: https://github.com/erasukarno87/chaolong-production/settings/secrets/actions
2. Klik **"New repository secret"**
3. Masukkan:
   - **Name:** `SUPABASE_ACCESS_TOKEN`
   - **Value:** [Paste token yang Anda copy dari Supabase]
4. Klik **"Add secret"**

---

## 📋 **Checklist Token yang Dibutuhkan**

Anda sudah punya:
- ✅ SUPABASE_PROJECT_ID
- ✅ SUPABASE_URL  
- ✅ SUPABASE_ANON_KEY
- ✅ SUPABASE_SERVICE_ROLE_KEY
- ⏳ SUPABASE_ACCESS_TOKEN ← **Ambil dari halaman ini**

---

## 🔗 **Link Langsung**

Untuk kemudahan, buka langsung di:

**https://app.supabase.com/account/tokens**

Token Anda akan terlihat di halaman ini. Cukup copy dan paste ke GitHub Secrets.

---

## ⚠️ **Penting**

- Jangan bagikan token ke orang lain
- Jangan push token ke GitHub (dalam kode)
- Selalu gunakan GitHub Secrets untuk menyimpan token
- Token akan terlihat di Supabase dashboard selamanya

---

## ✨ **Setelah Mendapatkan Token**

```
1. Copy dari Supabase → https://app.supabase.com/account/tokens
2. Paste ke GitHub Secrets → https://github.com/erasukarno87/chaolong-production/settings/secrets/actions
3. Semua secrets siap ✅
4. Deployment bisa dimulai 🚀
```

---

**Sudah jelas? Buka link di atas untuk copy token, kemudian beri tahu saya setelah semua secrets ditambahkan!** 😊
