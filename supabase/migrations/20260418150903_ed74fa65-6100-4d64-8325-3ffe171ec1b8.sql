-- Cambiar el valor por defecto de créditos para tarjetas estándar a 4
ALTER TABLE public.qr_cards
ALTER COLUMN download_credits SET DEFAULT 4;

-- Actualizar tarjetas estándar existentes que aún no han sido activadas
UPDATE public.qr_cards
SET download_credits = 4
WHERE card_type = 'standard'
  AND is_activated IS NOT TRUE;