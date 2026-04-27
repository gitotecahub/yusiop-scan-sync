-- Reset de estadísticas: borra compras de tarjetas, descargas, plays, y resetea pagos express+promo de submissions
-- IMPORTANTE: acción destructiva e irreversible

-- 1) Borrar earnings derivados (dependen de descargas)
DELETE FROM public.artist_earnings;

-- 2) Borrar descargas y reproducciones
DELETE FROM public.user_downloads;
DELETE FROM public.song_plays;
DELETE FROM public.song_shares;
DELETE FROM public.subscription_download_attempts;

-- 3) Borrar compras de tarjetas QR digitales y sus tarjetas asociadas
-- Primero borrar redenciones de regalos asociadas a esas tarjetas
DELETE FROM public.gift_redemptions
WHERE qr_card_id IN (SELECT id FROM public.qr_cards WHERE origin = 'digital');

DELETE FROM public.qr_cards WHERE origin = 'digital';
DELETE FROM public.card_purchases;

-- 4) Resetear pagos Express y borrar campañas Promo asociadas a submissions
UPDATE public.song_submissions
SET express_paid_at = NULL,
    express_requested_at = NULL,
    express_tier = NULL,
    express_price_xaf = NULL;

-- Borrar campañas de promo (release ads)
DELETE FROM public.ad_campaigns
WHERE campaign_type = 'artist_release';