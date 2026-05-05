-- Migration: tambah process_id + image_url ke autonomous_check_items
-- + storage bucket untuk gambar autonomous

-- 1. Tambah kolom ke tabel
ALTER TABLE autonomous_check_items
  ADD COLUMN IF NOT EXISTS process_id UUID REFERENCES processes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_url  TEXT;

-- 2. Index untuk query by process
CREATE INDEX IF NOT EXISTS idx_aci_process_id ON autonomous_check_items(process_id);

-- 3. Storage bucket untuk gambar item check autonomous
INSERT INTO storage.buckets (id, name, public)
VALUES ('autonomous-images', 'autonomous-images', true)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS policies untuk bucket
DROP POLICY IF EXISTS "auto_img_read"   ON storage.objects;
DROP POLICY IF EXISTS "auto_img_upload" ON storage.objects;
DROP POLICY IF EXISTS "auto_img_delete" ON storage.objects;

CREATE POLICY "auto_img_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'autonomous-images');

CREATE POLICY "auto_img_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'autonomous-images');

CREATE POLICY "auto_img_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'autonomous-images');
