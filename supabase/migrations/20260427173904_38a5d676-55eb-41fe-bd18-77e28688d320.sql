ALTER TABLE public.user_downloads
ADD COLUMN IF NOT EXISTS last_played_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_user_downloads_last_played_at
  ON public.user_downloads (user_id, last_played_at DESC);