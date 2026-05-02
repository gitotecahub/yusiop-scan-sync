ALTER TABLE public.user_downloads DROP CONSTRAINT IF EXISTS user_downloads_card_type_check;
ALTER TABLE public.user_downloads ADD CONSTRAINT user_downloads_card_type_check
  CHECK (card_type IS NULL OR card_type::text = ANY (ARRAY['standard','premium','subscription','wallet','gift']::text[]));