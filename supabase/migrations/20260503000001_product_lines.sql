-- ─── product_lines : many-to-many product ↔ line ─────────────────────────────
-- Menyimpan di lini mana suatu produk bisa diproduksi.
-- Satu produk bisa terdaftar di lebih dari satu lini.

CREATE TABLE IF NOT EXISTS public.product_lines (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  line_id    UUID NOT NULL REFERENCES public.lines(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, line_id)
);

ALTER TABLE public.product_lines ENABLE ROW LEVEL SECURITY;

-- Allow full access for authenticated users (same policy pattern as other master tables)
CREATE POLICY "product_lines_all" ON public.product_lines
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookup by line_id
CREATE INDEX IF NOT EXISTS idx_product_lines_line ON public.product_lines(line_id);
