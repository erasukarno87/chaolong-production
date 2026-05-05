-- =============================================================================
-- Migration: Groups, Group Leaders, Group Process Assignments
-- Setiap Line memiliki 1-5 Group, masing-masing terikat ke satu Shift.
-- Satu Line + Shift selalu hanya punya 1 Group aktif.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. groups — tim/regu yang bertugas di suatu line pada shift tertentu
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.groups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id    UUID        NOT NULL REFERENCES public.lines(id)   ON DELETE CASCADE,
  shift_id   UUID        NOT NULL REFERENCES public.shifts(id)  ON DELETE CASCADE,
  code       TEXT        NOT NULL,           -- "Group A", "Group B", "Group C", …
  sort_order INT         NOT NULL DEFAULT 0,
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Satu Line + Shift hanya boleh punya 1 Group
  UNIQUE (line_id, shift_id),
  -- Kode unik per line
  UNIQUE (line_id, code)
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_read"  ON public.groups FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "groups_write" ON public.groups FOR ALL    USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- ---------------------------------------------------------------------------
-- 2. group_leaders — siapa Leader yang bertanggung jawab atas sebuah Group
--    Many-to-many: satu Leader bisa pegang beberapa Group di beberapa Line
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_leaders (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES public.groups(id)    ON DELETE CASCADE,
  operator_id UUID        NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, operator_id)
);
ALTER TABLE public.group_leaders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_leaders_read"  ON public.group_leaders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "group_leaders_write" ON public.group_leaders FOR ALL    USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- ---------------------------------------------------------------------------
-- 3. group_process_assignments — formasi default: operator mana mengisi POS mana
--    dalam konteks Group tertentu.
--    - Satu POS bisa diisi >1 operator (multitasking)
--    - Satu operator bisa mengisi >1 POS dalam Group yang sama
--    - UNIQUE per (group, process, operator) — tidak boleh duplikat exact
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_process_assignments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES public.groups(id)    ON DELETE CASCADE,
  process_id  UUID        NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  operator_id UUID        NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, process_id, operator_id)
);
ALTER TABLE public.group_process_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gpa_read"  ON public.group_process_assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "gpa_write" ON public.group_process_assignments FOR ALL    USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- Indexes untuk query performa
CREATE INDEX idx_groups_line         ON public.groups                    (line_id);
CREATE INDEX idx_groups_shift        ON public.groups                    (shift_id);
CREATE INDEX idx_gl_group            ON public.group_leaders             (group_id);
CREATE INDEX idx_gl_operator         ON public.group_leaders             (operator_id);
CREATE INDEX idx_gpa_group           ON public.group_process_assignments (group_id);
CREATE INDEX idx_gpa_process         ON public.group_process_assignments (process_id);
CREATE INDEX idx_gpa_operator        ON public.group_process_assignments (operator_id);
CREATE INDEX idx_gpa_group_process   ON public.group_process_assignments (group_id, process_id);

-- ---------------------------------------------------------------------------
-- 4. shift_runs — tambah group_id (nullable untuk backward compat run lama)
-- ---------------------------------------------------------------------------
ALTER TABLE public.shift_runs
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shift_runs_group ON public.shift_runs (group_id);
