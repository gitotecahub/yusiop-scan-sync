CREATE POLICY "Song covers are readable"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'songs'
  AND (storage.foldername(name))[1] = 'covers'
);