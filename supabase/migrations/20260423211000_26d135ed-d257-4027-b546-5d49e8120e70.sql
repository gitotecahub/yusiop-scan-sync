ALTER TABLE public.user_downloads
ADD COLUMN IF NOT EXISTS hidden_from_library boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_downloads_user_hidden
ON public.user_downloads (user_id, hidden_from_library);