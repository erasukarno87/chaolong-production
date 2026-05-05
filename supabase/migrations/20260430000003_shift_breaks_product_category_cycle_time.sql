-- =============================================================================
-- Migration: shift_breaks, products.category, production_targets.cycle_time_seconds
-- Jalankan di Supabase SQL Editor (cloud DB yang sudah ada).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabel shift_breaks — detail interval istirahat per shift (max 3)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shift_breaks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id         UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  break_order      INT  NOT NULL CHECK (break_order BETWEEN 1 AND 3),
  start_time       TIME NOT NULL,
  duration_minutes INT  NOT NULL CHECK (duration_minutes > 0),
  label            TEXT NOT NULL DEFAULT 'Istirahat',
  UNIQUE (shift_id, break_order)
);
ALTER TABLE public.shift_breaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shift_breaks_read"  ON public.shift_breaks FOR SELECT TO authenticated USING (true);
CREATE POLICY "shift_breaks_admin" ON public.shift_breaks FOR ALL    TO authenticated
  USING      (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ---------------------------------------------------------------------------
-- 2. Trigger: auto-sync shifts.break_minutes = SUM(shift_breaks.duration_minutes)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_shift_break_minutes()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_shift_id UUID;
BEGIN
  v_shift_id := COALESCE(NEW.shift_id, OLD.shift_id);
  UPDATE public.shifts
  SET break_minutes = (
    SELECT COALESCE(SUM(duration_minutes), 0)
    FROM public.shift_breaks
    WHERE shift_id = v_shift_id
  )
  WHERE id = v_shift_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS tg_sync_break_minutes ON public.shift_breaks;
CREATE TRIGGER tg_sync_break_minutes
  AFTER INSERT OR UPDATE OR DELETE ON public.shift_breaks
  FOR EACH ROW EXECUTE FUNCTION public.sync_shift_break_minutes();

-- ---------------------------------------------------------------------------
-- 3. products.category — kelompok produk (CCU, Fuel Sender, dll.)
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category TEXT;

-- ---------------------------------------------------------------------------
-- 4. production_targets.cycle_time_seconds — cycle time per produk × man power
-- ---------------------------------------------------------------------------
ALTER TABLE public.production_targets
  ADD COLUMN IF NOT EXISTS cycle_time_seconds NUMERIC(10,2)
    CHECK (cycle_time_seconds IS NULL OR cycle_time_seconds > 0);

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
