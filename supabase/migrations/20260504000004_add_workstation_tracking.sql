-- =============================================================================
-- Migration: add_workstation_tracking
-- Menambahkan workstation_id untuk traceability production per POS
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tabel workstation (master data workstation/mesin)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workstations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id         UUID        NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  process_id      UUID        REFERENCES public.processes(id) ON DELETE SET NULL,
  code            TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  machine_number  TEXT,
  location        TEXT,
  status          TEXT        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'maintenance', 'breakdown', 'idle')),
  active          BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (line_id, code)
);

ALTER TABLE public.workstations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workstations_read" ON public.workstations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "workstations_admin" ON public.workstations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER tg_workstations_updated 
  BEFORE UPDATE ON public.workstations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_workstations_line ON public.workstations (line_id);
CREATE INDEX IF NOT EXISTS idx_workstations_process ON public.workstations (process_id);

-- ---------------------------------------------------------------------------
-- 2. Tabel shift run setup audit ( untuk audit trail setup phase )
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shift_run_setup_audit (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_run_id          UUID        NOT NULL REFERENCES public.shift_runs(id) ON DELETE CASCADE,
  
  -- Setup step yang di-audit
  setup_step            TEXT        NOT NULL,
  setup_action          TEXT        NOT NULL,
  
  -- Detail perubahan
  previous_value        JSONB,
  new_value             JSONB,
  
  -- Timestamp
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  
  -- Siapa yang mengubah
  created_by_user_id    UUID        REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_by_operator_id UUID       REFERENCES public.operators(id)
);

CREATE INDEX IF NOT EXISTS idx_shift_run_setup_audit_run
  ON public.shift_run_setup_audit (shift_run_id);

ALTER TABLE public.shift_run_setup_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shift_run_setup_audit_read" ON public.shift_run_setup_audit
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "shift_run_setup_audit_write" ON public.shift_run_setup_audit
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') 
         OR public.has_role(auth.uid(), 'leader'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') 
              OR public.has_role(auth.uid(), 'leader'));

-- ---------------------------------------------------------------------------
-- 3. Tabel NG disposition audit ( untuk tracking chain NG )
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ng_disposition_audit (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ng_entry_id       UUID        NOT NULL REFERENCES public.ng_entries(id) ON DELETE CASCADE,
  
  -- Siapa yang decision
  decided_by_operator_id UUID   REFERENCES public.operators(id),
  decided_by_user_id     UUID   REFERENCES auth.users(id),
  
  -- Disposition lama dan baru
  previous_disposition   public.ng_disposition,
  new_disposition        public.ng_disposition,
  
  -- Alasan perubahan
  reason                TEXT,
  
  -- Estimasi cost impact
  cost_impact           NUMERIC(15,2),
  
  -- Timestamp
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ng_disposition_audit_entry
  ON public.ng_disposition_audit (ng_entry_id);

ALTER TABLE public.ng_disposition_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ng_disposition_audit_read" ON public.ng_disposition_audit
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ng_disposition_audit_write" ON public.ng_disposition_audit
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') 
         OR public.has_role(auth.uid(), 'leader'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') 
              OR public.has_role(auth.uid(), 'leader'));

-- ---------------------------------------------------------------------------
-- 4. Tabel EOSR signatures ( untuk digital signature EOSR )
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eosr_signatures (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  eosr_report_id  UUID        NOT NULL REFERENCES public.eosr_reports(id) ON DELETE CASCADE,
  
  -- Tipe signer: leader, supervisor, manager
  signer_role     TEXT        NOT NULL CHECK (signer_role IN ('leader', 'supervisor', 'manager', 'quality')),
  
  -- Info signer
  signer_name     TEXT        NOT NULL,
  signer_title    TEXT,
  
  -- Signature (base64 image atau hash)
  signature_data  TEXT,
  
  -- Status approval
  approved        BOOLEAN     NOT NULL DEFAULT false,
  approved_at      TIMESTAMPTZ,
  
  -- Catatan
  note            TEXT,
  
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eosr_signatures_report
  ON public.eosr_signatures (eosr_report_id);

ALTER TABLE public.eosr_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eosr_signatures_read" ON public.eosr_signatures
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "eosr_signatures_write" ON public.eosr_signatures
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') 
         OR public.has_role(auth.uid(), 'leader'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') 
              OR public.has_role(auth.uid(), 'leader'));

-- ---------------------------------------------------------------------------
-- 5. Add workstation_id to hourly_outputs, ng_entries, downtime_entries
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'hourly_outputs' 
    AND column_name = 'workstation_id'
  ) THEN
    ALTER TABLE public.hourly_outputs 
      ADD COLUMN workstation_id UUID REFERENCES public.workstations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_hourly_outputs_workstation 
      ON public.hourly_outputs (workstation_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ng_entries' 
    AND column_name = 'workstation_id'
  ) THEN
    ALTER TABLE public.ng_entries 
      ADD COLUMN workstation_id UUID REFERENCES public.workstations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_ng_entries_workstation 
      ON public.ng_entries (workstation_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    AND table_name = 'downtime_entries' 
    AND column_name = 'workstation_id'
  ) THEN
    ALTER TABLE public.downtime_entries 
      ADD COLUMN workstation_id UUID REFERENCES public.workstations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_downtime_entries_workstation 
      ON public.downtime_entries (workstation_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
COMMIT;