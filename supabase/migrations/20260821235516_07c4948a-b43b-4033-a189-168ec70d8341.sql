-- Elimina la política que permite a cualquier usuario autenticado
-- activar tarjetas QR de forma masiva (activación debe pasar solo
-- por la edge function activate-qr con service role).
DROP POLICY IF EXISTS "Authenticated users can activate QR cards" ON public.qr_cards;
