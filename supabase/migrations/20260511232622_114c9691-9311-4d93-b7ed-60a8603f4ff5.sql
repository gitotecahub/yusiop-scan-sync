-- Stats / plays
DELETE FROM public.song_plays;
DELETE FROM public.user_downloads;
DELETE FROM public.game_answers;
DELETE FROM public.game_sessions;

-- Artist earnings & withdrawals
DELETE FROM public.artist_earnings;
DELETE FROM public.artist_withdrawal_requests;

-- Wallet
DELETE FROM public.wallet_transactions;

-- Subscriptions
DELETE FROM public.user_subscriptions;

-- Ad campaigns paid
DELETE FROM public.ad_campaigns;

-- Express payments on submissions: clear flags
UPDATE public.song_submissions
SET express_paid_at = NULL, express_price_xaf = NULL
WHERE express_paid_at IS NOT NULL;

-- Card purchases & QR
DELETE FROM public.gift_redemptions;
DELETE FROM public.card_purchases;

-- Reset QR cards: digital ones (purchased) get removed; physical ones get deactivated
DELETE FROM public.qr_cards WHERE origin = 'digital';
UPDATE public.qr_cards
SET is_activated = false,
    activated_by = NULL,
    activated_at = NULL,
    owner_user_id = NULL,
    gift_redeemed = false,
    gift_redeemed_at = NULL
WHERE origin = 'physical';

-- Recharge cards: mark unused
UPDATE public.recharge_cards
SET status = 'active', used_at = NULL, used_by = NULL
WHERE used_at IS NOT NULL;

-- Song gifts
DELETE FROM public.song_gifts;

-- Reset credits for all profiles
UPDATE public.profiles SET downloads_remaining = 0;