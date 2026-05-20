
-- Reset wallets y balances (continuación tras error de columna)
UPDATE public.user_wallets SET balance = 0, total_recharged = 0, total_spent = 0, updated_at = now();
DELETE FROM public.user_balance;
DELETE FROM public.qr_cards WHERE purchase_id IS NOT NULL OR origin = 'digital';
UPDATE public.qr_cards
  SET is_activated = false,
      activated_at = NULL,
      activated_by = NULL,
      owner_user_id = NULL,
      gift_redeemed = false,
      gift_redeemed_at = NULL
  WHERE is_activated = true;
DELETE FROM public.card_purchases;
UPDATE public.recharge_cards
  SET status = 'active', used_by = NULL, used_at = NULL
  WHERE used_by IS NOT NULL OR used_at IS NOT NULL OR status <> 'active';
UPDATE public.profiles SET downloads_remaining = 0 WHERE downloads_remaining <> 0;
