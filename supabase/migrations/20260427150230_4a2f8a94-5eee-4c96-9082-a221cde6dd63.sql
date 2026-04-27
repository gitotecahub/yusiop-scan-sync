UPDATE storage.buckets SET public = true WHERE id = 'songs';

DROP POLICY IF EXISTS "Song covers are readable" ON storage.objects;