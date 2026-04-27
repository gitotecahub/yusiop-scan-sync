-- 1) Añadir nuevo valor al enum
ALTER TYPE public.song_submission_status ADD VALUE IF NOT EXISTS 'pending_payment';
