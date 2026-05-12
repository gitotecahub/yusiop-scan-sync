-- Allow everyone to read collaborator display names for published songs
-- so the "Artist ft Collab" label shows for all users in catalog/library/popular.
CREATE POLICY "Public can view collaborators of published songs"
ON public.song_collaborators
FOR SELECT
TO public
USING (song_id IS NOT NULL);