-- Reset Monetización: borrar tarjetas físicas y dependencias
DELETE FROM public.gift_redemptions
WHERE qr_card_id IN (SELECT id FROM public.qr_cards WHERE origin = 'physical');

DELETE FROM public.qr_cards WHERE origin = 'physical';