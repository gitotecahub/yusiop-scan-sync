
UPDATE public.user_wallets
SET balance = 0,
    total_recharged = 0,
    total_spent = 0,
    updated_at = now();

DELETE FROM public.wallet_transactions;
DELETE FROM public.song_plays;
DELETE FROM public.user_downloads;
DELETE FROM public.artist_earnings;
DELETE FROM public.artist_withdrawal_requests;
DELETE FROM public.card_purchases;
DELETE FROM public.gift_redemptions;
DELETE FROM public.song_gifts;
DELETE FROM public.game_answers;
DELETE FROM public.game_sessions;
DELETE FROM public.user_subscriptions;
DELETE FROM public.ad_campaigns;

UPDATE public.profiles SET downloads_remaining = 0;
