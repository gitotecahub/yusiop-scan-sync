ALTER TABLE public.song_submissions
ADD COLUMN IF NOT EXISTS nationality text;

COMMENT ON COLUMN public.song_submissions.nationality IS 'ISO 3166-1 alpha-2 country code of the primary artist (e.g. ES, US, MX). Optional.';