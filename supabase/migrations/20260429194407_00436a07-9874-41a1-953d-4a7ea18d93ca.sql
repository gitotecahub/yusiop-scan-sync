-- Permitir al comprador ver su tarjeta digital aunque aún no esté activada
CREATE POLICY "Buyers can view their purchased unactivated cards"
ON public.qr_cards
FOR SELECT
TO authenticated
USING (
  purchase_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.card_purchases cp
    WHERE cp.id = qr_cards.purchase_id
      AND cp.buyer_user_id = auth.uid()
  )
);