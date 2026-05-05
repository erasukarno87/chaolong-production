-- =============================================================================
-- FIX: Update operators_public view + Setup storage bucket foto operator
-- Jalankan sekali di Supabase SQL Editor.
-- =============================================================================

-- 1. Recreate view operators_public dengan semua kolom baru
--    (join_date, position, photo_url, supervisor_id)
DROP VIEW IF EXISTS public.operators_public CASCADE;

CREATE VIEW public.operators_public WITH (security_invoker = true) AS
SELECT
  o.id,
  o.full_name,
  o.employee_code,
  o.role,
  o.initials,
  o.avatar_color,
  o.active,
  o.join_date,
  o.photo_url,
  o.position,
  o.supervisor_id,
  o.created_at,
  -- Backward-compat: computed dari operator_line_assignments
  COALESCE(
    ARRAY(
      SELECT line_id FROM public.operator_line_assignments
      WHERE  operator_id = o.id
      ORDER  BY is_default DESC, created_at ASC
    ),
    ARRAY[]::UUID[]
  ) AS assigned_line_ids
FROM public.operators o;

GRANT SELECT ON public.operators_public TO authenticated, anon;

-- 2. Buat storage bucket untuk foto operator (public = true)
INSERT INTO storage.buckets (id, name, public)
VALUES ('operator-photos', 'operator-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. RLS policies untuk storage bucket
--    Baca: semua user (authenticated & anon) — diperlukan agar <img src> di browser bisa load
--    Upload & Delete: hanya authenticated
DROP POLICY IF EXISTS "op_photos_read"   ON storage.objects;
DROP POLICY IF EXISTS "op_photos_upload" ON storage.objects;
DROP POLICY IF EXISTS "op_photos_delete" ON storage.objects;

CREATE POLICY "op_photos_read" ON storage.objects
  FOR SELECT TO public                      -- 'public' = authenticated + anon
  USING (bucket_id = 'operator-photos');

CREATE POLICY "op_photos_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'operator-photos');

CREATE POLICY "op_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'operator-photos');
