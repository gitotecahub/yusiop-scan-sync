-- Reset KPI/CRM statistics
TRUNCATE TABLE public.user_downloads RESTART IDENTITY;
TRUNCATE TABLE public.gift_redemptions RESTART IDENTITY;
TRUNCATE TABLE public.card_purchases RESTART IDENTITY;

-- Reset gift redemption flags on QR cards so stats are coherent
UPDATE public.qr_cards
SET gift_redeemed = false,
    gift_redeemed_at = NULL,
    is_activated = false,
    activated_at = NULL,
    activated_by = NULL,
    owner_user_id = NULL,
    purchase_id = NULL;