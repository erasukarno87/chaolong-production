-- =============================================================================
-- Migration: autonomous_check_items
-- Item check Autonomous Maintenance per Line (dinamis, tiap line berbeda)
-- Jalankan di Supabase SQL Editor (cloud DB yang sudah ada).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabel autonomous_check_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.autonomous_check_items (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id     UUID    NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  code        TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  category    TEXT,                          -- Kebersihan, Pelumasan, Inspeksi, Pengencangan, K3, dll.
  frequency   TEXT    NOT NULL DEFAULT 'Setiap Shift', -- Setiap Shift | Harian | Mingguan | Bulanan
  standard    TEXT,                          -- Kondisi standar / target yang diharapkan
  method      TEXT,                          -- Cara / metode pemeriksaan
  sort_order  INT     NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (line_id, code)
);

-- RLS
ALTER TABLE public.autonomous_check_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autonomous_check_items_read"
  ON public.autonomous_check_items FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "autonomous_check_items_admin"
  ON public.autonomous_check_items FOR ALL TO authenticated
  USING      (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Index untuk query per line
CREATE INDEX IF NOT EXISTS idx_autonomous_check_items_line
  ON public.autonomous_check_items (line_id, sort_order);

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
