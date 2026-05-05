-- =============================================================================
-- Migration: Reference / Lookup Tables (menggantikan data hardcoded di kode)
-- Tabel-tabel ini menampung pilihan dropdown yang sebelumnya hardcoded di .tsx.
-- Jalankan di Supabase SQL Editor (cloud DB yang sudah ada).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: kolom standar untuk semua tabel referensi
-- id, name, sort_order, active
-- ---------------------------------------------------------------------------

-- 1. Kategori Produk (sebelumnya PRODUCT_CATEGORIES array di ProductsTab.tsx)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ref_product_categories (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL,
  sort_order INT     NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (name)
);
ALTER TABLE public.ref_product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_product_categories_read"  ON public.ref_product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_product_categories_admin" ON public.ref_product_categories FOR ALL    TO authenticated
  USING      (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 2. Klasifikasi NG / Grup Defect (sebelumnya NG_CATEGORIES array di NgCategoriesTab.tsx)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ref_ng_classes (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL,
  sort_order INT     NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (name)
);
ALTER TABLE public.ref_ng_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_ng_classes_read"  ON public.ref_ng_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_ng_classes_admin" ON public.ref_ng_classes FOR ALL    TO authenticated
  USING      (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 3. Klasifikasi Downtime / Grup 5M+E (sebelumnya DT_CATEGORIES array di DowntimeCategoriesTab.tsx)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ref_downtime_classes (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL,
  sort_order INT     NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (name)
);
ALTER TABLE public.ref_downtime_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_downtime_classes_read"  ON public.ref_downtime_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_downtime_classes_admin" ON public.ref_downtime_classes FOR ALL    TO authenticated
  USING      (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 4. Kategori Item Check Autonomous (sebelumnya CHECK_CATEGORIES array di AutonomousTab.tsx)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ref_autonomous_categories (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL,
  sort_order INT     NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (name)
);
ALTER TABLE public.ref_autonomous_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_autonomous_categories_read"  ON public.ref_autonomous_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_autonomous_categories_admin" ON public.ref_autonomous_categories FOR ALL    TO authenticated
  USING      (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 5. Frekuensi Check Autonomous (sebelumnya FREQUENCIES array di AutonomousTab.tsx)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ref_autonomous_frequencies (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL,
  sort_order INT     NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (name)
);
ALTER TABLE public.ref_autonomous_frequencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_autonomous_frequencies_read"  ON public.ref_autonomous_frequencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_autonomous_frequencies_admin" ON public.ref_autonomous_frequencies FOR ALL    TO authenticated
  USING      (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
