BEGIN;
DELETE FROM public.user_downloads;
DELETE FROM public.gift_redemptions;
DELETE FROM public.card_purchases;
DELETE FROM public.qr_cards;
DELETE FROM public.collaboration_claims;
DELETE FROM public.song_submissions;
DELETE FROM public.artist_requests;
DELETE FROM public.notifications;
DELETE FROM public.user_favorites;
DELETE FROM public.user_balance;
DELETE FROM public.user_credits;
DELETE FROM public.user_sessions;
DELETE FROM public.active_sessions;
DELETE FROM public.admin_user_notes;
UPDATE public.profiles
  SET downloads_remaining = 0,
      profile_choice_made = false,
      last_used_mode = 'user',
      preferred_mode = 'user';
COMMIT;