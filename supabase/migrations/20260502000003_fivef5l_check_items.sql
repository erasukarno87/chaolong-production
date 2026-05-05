-- ============================================================
-- Migration: tabel fivef5l_check_items
-- 5F5L = 5 First / 5 Last Inspection per Line
--
-- Setiap item check mewakili 1 baris pada checksheet 5F5L.
-- Item yang sama digunakan untuk sesi "5 First" maupun "5 Last"
-- (perbedaan hanya pada waktu pelaksanaan, bukan konten item).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fivef5l_check_items (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id       UUID        NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  process_id    UUID        REFERENCES public.processes(id) ON DELETE SET NULL,

  -- Nomor kelompok (kolom "No" di checksheet, misal 1–11)
  sort_group    INTEGER     NOT NULL DEFAULT 1,
  -- Nama kelompok / checking point (misal "Burning Program (BETA)")
  group_name    TEXT        NOT NULL,

  -- Teks spesifikasi / kondisi yang diperiksa
  specification TEXT        NOT NULL,

  -- Metode pemeriksaan (default Visual)
  method        TEXT        NOT NULL DEFAULT 'Visual',

  -- Tipe input saat pengisian:
  --   'ok_ng'  → tombol OK / NG
  --   'float'  → input angka desimal (misal voltage, arus)
  --   'text'   → input teks bebas (misal versi software)
  input_type    TEXT        NOT NULL DEFAULT 'ok_ng'
                            CHECK (input_type IN ('ok_ng', 'float', 'text')),

  sort_order    INTEGER     NOT NULL DEFAULT 0,
  active        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (line_id, sort_group, sort_order)
);

-- Index untuk query per line
CREATE INDEX IF NOT EXISTS idx_fivef5l_line_id
  ON public.fivef5l_check_items (line_id);

-- Index untuk query per line + group (tampilan grouped)
CREATE INDEX IF NOT EXISTS idx_fivef5l_line_group
  ON public.fivef5l_check_items (line_id, sort_group, sort_order);

-- RLS
ALTER TABLE public.fivef5l_check_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fivef5l_read"   ON public.fivef5l_check_items;
DROP POLICY IF EXISTS "fivef5l_write"  ON public.fivef5l_check_items;

CREATE POLICY "fivef5l_read" ON public.fivef5l_check_items
  FOR SELECT USING (true);

CREATE POLICY "fivef5l_write" ON public.fivef5l_check_items
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
