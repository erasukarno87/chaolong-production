
# Production System — PT. Chao Long Motor Parts Indonesia

A factory-floor production app combining the **Forms System** (master data + shift entry) and the **Live Monitoring Dashboard** from the uploaded mockups, wrapped in a real role-aware app with shared-device PIN sign-in and a responsive layout.

## 1. Roles & permissions

| Role | Can do |
|---|---|
| **Super Admin** | Full master data: lines, products, operators, processes, targets, shift configs. Manages users, roles, PINs. Sees everything. |
| **Production Leader** | Runs a shift on a chosen line: setup wizard, hourly output, NG entries, downtime, end-of-shift report. Read live monitoring. |
| **Operator** | Limited input: hourly output for assigned line, log NG defects. No master data, no EOSR submit. |
| **Viewer / Management** | Read-only access to the Live Monitoring Dashboard. No forms. |

Roles are stored server-side in a separate `user_roles` table, enforced by RLS via a `has_role()` security-definer function. Roles are never trusted from the client.

## 2. Authentication — PIN on shared device

Designed for tablets/PCs left on the shop floor.

- **Device sign-in (Supabase email/password)** done once per shared device — e.g. `tablet-line-a@chaolong.local`. This puts the device into an authenticated session that can read the operator roster.
- **Operator PIN unlock** on top of the device session: a name-grid → 4–6 digit PIN screen. The active operator (and their role) is held in app state and stamped onto every record they create (`created_by_operator_id`).
- **Idle auto-lock**: after N minutes of inactivity, return to the PIN screen (device stays signed in).
- **Switch user** button in the header to swap operators mid-shift.
- Super Admin / Viewer can also sign in with their own email/password from any device (no PIN needed).

PINs are stored as bcrypt hashes server-side and verified through an edge function — never compared on the client.

## 3. Responsive / flexible view

A single codebase that adapts:

| Breakpoint | Layout |
|---|---|
| **Mobile (<768px)** | Single column. Bottom tab bar for the 3–5 main sections. Forms become step-by-step. Tables collapse into stacked cards. Header compresses to logo + clock + user. |
| **Tablet (768–1199px)** | Two-column grids where it helps. Top tab bar like the HTML mockup. Sidebar can be toggled. Optimized for landscape shop-floor tablets. |
| **Desktop (≥1200px)** | Full sidebar nav (collapsible), 3–4 column metric grids, full-width hourly tables, side-by-side OEE + quality charts. |

Plus a **density toggle** (Compact / Comfortable) and a **dark mode** for monitoring screens mounted on the line.

## 4. App structure

```text
/login              (device sign-in OR admin/viewer email login)
/unlock             (operator name + PIN)
/                   role-based redirect
/monitoring         Live Dashboard (Viewer, Leader, Admin)
   ├ Panel 1 · Status Line     (5F/5L, autonomous maint., hourly bars)
   ├ Panel 2 · OEE & Quality   (donut, OTR/PER/QR, top NG)
   └ Panel 3 · Skill Matrix    (operators × processes)
/shift              Leader/Operator entry
   ├ Setup Wizard (4 steps)
   ├ Hourly Output (editable table)
   ├ NG Entries
   ├ Downtime
   └ End-of-Shift Report (Leader only)
/admin              Super Admin only
   ├ Lini Produksi
   ├ Master Produk
   ├ Operator (incl. PIN reset)
   ├ Proses & Sub-Proses
   ├ Target Produksi
   ├ Konfigurasi Shift
   └ Users & Roles
```

Navigation: collapsible left sidebar on desktop/tablet, bottom tab bar on mobile. Routes guarded by role; unauthorized access redirects to the role's home page.

## 5. Data model (high level)

- `profiles` — user metadata (name, role assignment via `user_roles`)
- `user_roles` — `(user_id, role)` with enum `super_admin | leader | operator | viewer`
- `operators` — shop-floor staff with hashed `pin`, assigned line(s)
- `lines`, `products`, `processes`, `sub_processes`
- `production_targets` — per line × product × shift
- `shifts` — shift definitions (Shift 1, 2, 3, breaks)
- `shift_runs` — one row per started shift (line, product, leader, start/end, status)
- `hourly_outputs` — per shift_run × hour (actual, ng, downtime_min, note)
- `ng_entries` — defects with type, qty, sub-process, disposition
- `downtime_entries` — category, type (planned/unplanned), duration, root cause
- `check_sheet_results` — 5F/5L and autonomous maintenance items
- `eosr_reports` — end-of-shift summary, leader signature, generated PDF link
- `operator_skills` — skill matrix levels (0–4) per operator × process

All tables get RLS: admins read/write everything; leaders read/write only their line's current shift_run; operators read/write only hourly + NG for their assigned line; viewers read monitoring views only.

## 6. Live Monitoring updates

The dashboard auto-refreshes via Supabase Realtime subscriptions on `hourly_outputs`, `ng_entries`, `downtime_entries`, and `check_sheet_results`. Banner stats, hourly bars, OEE donut, and top-NG list update without a page reload. A LIVE indicator in the header reflects subscription health.

## 7. Seed data

The app ships pre-seeded so it's demoable immediately:
- Lines: LINE-A (Commun. Cont. Unit), LINE-B placeholder
- Product: MCU-001 — ECU CB150 with model B6Y-12
- Operators: 6–8 sample names with PINs, roles, and skill matrix entries
- Processes: BT Burning Beta, MCU Flash, Final FI, Visual & Pack, Soldering, Conformal Coat
- One in-progress Shift 1 with realistic hourly outputs, sample NG and downtime entries, completed autonomous maintenance, partial 5F/5L
- Default PINs are random per operator and listed once for the admin to rotate

## 8. Visual design

Carries over the design tokens from the mockups so the look matches:
- Fonts: **Outfit** (UI) + **JetBrains Mono** (numeric)
- Palette: Blue `#1A6EFA`, Green `#00B37D`, Amber `#F59E0B`, Red `#EF4444`, surface `#F4F6FA`
- Rounded cards, soft shadows, status chips, pill badges, gradient progress bars, animated counters
- Dark monitoring mode for wall displays

## 9. Technical notes

- React + Vite + Tailwind + shadcn/ui (existing stack)
- chaolong Cloud (Supabase) for DB, auth, realtime, storage
- Edge function `verify-operator-pin` for PIN bcrypt check + session bootstrap
- Edge function `generate-eosr-pdf` for the end-of-shift PDF
- React Router with role guards via a `<RequireRole>` wrapper
- TanStack Query for data fetching + Realtime invalidation
- Charts: lightweight SVG (matching mockup style) — no heavy chart lib

## 10. Build order

1. Auth foundation: schema (`profiles`, `user_roles`, `operators`), RLS, `has_role()`, login + PIN unlock screens, role-aware shell with responsive sidebar/bottom-nav.
2. Master data CRUD (Admin): lines, products, processes, targets, shifts, operators (with PIN reset).
3. Shift forms (Leader/Operator): setup wizard → hourly output → NG → downtime → EOSR + PDF.
4. Live Monitoring Dashboard with Realtime subscriptions.
5. Skill Matrix panel + Users & Roles admin.
6. Seed script, polish, dark monitoring mode, idle auto-lock.

After approval I'll start with step 1.
