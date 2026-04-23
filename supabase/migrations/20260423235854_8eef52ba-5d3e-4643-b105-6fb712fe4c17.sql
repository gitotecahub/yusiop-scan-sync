-- Asegurar rol artist (idempotente)
INSERT INTO public.user_roles (user_id, role)
VALUES ('2d1db90b-878c-4250-aa88-90123928b23e', 'artist')
ON CONFLICT DO NOTHING;

-- Crear artist_request aprobada que vincula al usuario con el nombre artístico "Diddyes"
INSERT INTO public.artist_requests (user_id, artist_name, status, reviewed_at)
SELECT '2d1db90b-878c-4250-aa88-90123928b23e', 'Diddyes', 'approved', now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.artist_requests
  WHERE user_id = '2d1db90b-878c-4250-aa88-90123928b23e'
    AND lower(artist_name) = 'diddyes'
    AND status = 'approved'
);

-- Asignar colaboraciones existentes sin reclamar cuyo artist_name = 'Diddyes'
UPDATE public.song_collaborators
SET claimed_by_user_id = '2d1db90b-878c-4250-aa88-90123928b23e',
    claimed_at = now()
WHERE song_id IS NOT NULL
  AND claimed_by_user_id IS NULL
  AND lower(artist_name) = 'diddyes';