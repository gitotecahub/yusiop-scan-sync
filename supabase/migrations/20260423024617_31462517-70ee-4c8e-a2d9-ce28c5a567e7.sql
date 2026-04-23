CREATE OR REPLACE FUNCTION public.get_gift_preview(p_token text)
RETURNS TABLE(code text, card_type public.card_type, download_credits integer, gift_redeemed boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.code, q.card_type, q.download_credits, q.gift_redeemed
  FROM public.qr_cards q
  WHERE q.redemption_token = p_token
    AND q.is_gift = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_gift_preview(text) TO anon, authenticated;