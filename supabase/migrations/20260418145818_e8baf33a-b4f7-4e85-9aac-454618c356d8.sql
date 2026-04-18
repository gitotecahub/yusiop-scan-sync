-- Tighten albums/artists/songs write policies to admins only
DROP POLICY IF EXISTS "albums_insert" ON public.albums;
DROP POLICY IF EXISTS "albums_update" ON public.albums;
DROP POLICY IF EXISTS "albums_delete" ON public.albums;

CREATE POLICY "Admins can insert albums" ON public.albums
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update albums" ON public.albums
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete albums" ON public.albums
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "artists_insert" ON public.artists;
DROP POLICY IF EXISTS "artists_update" ON public.artists;
DROP POLICY IF EXISTS "artists_delete" ON public.artists;

CREATE POLICY "Admins can insert artists" ON public.artists
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update artists" ON public.artists
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete artists" ON public.artists
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "songs_insert" ON public.songs;
DROP POLICY IF EXISTS "songs_update" ON public.songs;
DROP POLICY IF EXISTS "songs_delete" ON public.songs;

CREATE POLICY "Admins can insert songs" ON public.songs
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update songs" ON public.songs
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete songs" ON public.songs
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));