-- 1. Fix QR cards activation policy: require authentication and self-attribution
DROP POLICY IF EXISTS "Allow QR card activation updates" ON public.qr_cards;

CREATE POLICY "Authenticated users can activate QR cards"
ON public.qr_cards
FOR UPDATE
TO authenticated
USING (
  (is_activated IS NOT TRUE)
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  is_activated = true
  AND activated_by = auth.uid()
);

-- 2. Remove client-side ability to update user_credits
DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;
-- Users keep SELECT access only. Edge functions (service role) handle decrements.

-- 3. Restrict songs storage bucket writes to admins
DROP POLICY IF EXISTS "Anyone can upload songs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update songs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete songs" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload songs" ON storage.objects;
DROP POLICY IF EXISTS "Public can update songs" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete songs" ON storage.objects;
DROP POLICY IF EXISTS "Songs are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload songs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update songs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete songs" ON storage.objects;
DROP POLICY IF EXISTS "Songs public read" ON storage.objects;

CREATE POLICY "Songs public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'songs');

CREATE POLICY "Admins can upload songs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'songs' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update songs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'songs' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'songs' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete songs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'songs' AND public.is_admin(auth.uid()));

-- 4. Restrict avatars writes to the user's own folder (avatars/{user_id}/...)
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Avatar public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Fix mutable search_path on update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;