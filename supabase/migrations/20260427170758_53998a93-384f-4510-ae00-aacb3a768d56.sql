ALTER TABLE public.user_downloads
DROP CONSTRAINT IF EXISTS user_downloads_card_type_check;

ALTER TABLE public.user_downloads
ADD CONSTRAINT user_downloads_card_type_check
CHECK (card_type IS NULL OR card_type IN ('standard', 'premium', 'subscription', 'wallet'));

COMMENT ON CONSTRAINT user_downloads_card_type_check ON public.user_downloads
IS 'Permite registrar descargas pagadas por tarjeta QR, suscripción o saldo recargado en wallet.';