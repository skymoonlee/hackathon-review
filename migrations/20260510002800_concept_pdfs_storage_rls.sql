-- Allow guests + signed-in judges to upload/read PDFs in the concept-pdfs bucket.
-- The bucket itself is already public; this opens the underlying storage.objects RLS.

CREATE POLICY concept_pdfs_anon_read
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket = 'concept-pdfs');

CREATE POLICY concept_pdfs_anon_write
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket = 'concept-pdfs');
