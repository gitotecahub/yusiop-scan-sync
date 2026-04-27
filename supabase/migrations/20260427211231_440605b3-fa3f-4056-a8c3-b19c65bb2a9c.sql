DO $$
DECLARE
  admin_id uuid := '17ca015d-6e69-4023-8150-1820080bfa1c';
  victims uuid[];
BEGIN
  SELECT array_agg(id) INTO victims FROM auth.users WHERE id <> admin_id;

  -- Limpiar tablas públicas que referencian usuarios (sin FK cascade)
  DELETE FROM public.active_sessions WHERE user_id = ANY(victims);
  DELETE FROM public.notifications WHERE user_id = ANY(victims);
  DELETE FROM public.admin_user_notes WHERE target_user_id = ANY(victims) OR author_user_id = ANY(victims);
  DELETE FROM public.subscription_download_attempts WHERE user_id = ANY(victims);
  DELETE FROM public.song_plays WHERE user_id = ANY(victims);
  DELETE FROM public.song_shares WHERE user_id = ANY(victims);
  DELETE FROM public.gift_redemptions WHERE redeemed_by_user_id = ANY(victims);
  DELETE FROM public.collaboration_claims WHERE claimant_user_id = ANY(victims);
  DELETE FROM public.song_collaborators WHERE claimed_by_user_id = ANY(victims);
  DELETE FROM public.artist_withdrawal_requests WHERE user_id = ANY(victims);
  DELETE FROM public.artist_withdrawal_methods WHERE user_id = ANY(victims);
  DELETE FROM public.artist_earnings WHERE user_id = ANY(victims);
  DELETE FROM public.artist_requests WHERE user_id = ANY(victims);
  DELETE FROM public.song_submissions WHERE user_id = ANY(victims);
  DELETE FROM public.card_purchases WHERE buyer_user_id = ANY(victims);
  UPDATE public.qr_cards SET activated_by = NULL, owner_user_id = NULL, is_activated = false, activated_at = NULL
    WHERE activated_by = ANY(victims) OR owner_user_id = ANY(victims);
  DELETE FROM public.recharge_cards WHERE used_by = ANY(victims);
  DELETE FROM public.ad_campaigns WHERE user_id = ANY(victims);
  DELETE FROM public.ad_requests WHERE user_id = ANY(victims);
  DELETE FROM public.staff_permissions WHERE user_id = ANY(victims);
  DELETE FROM public.user_roles WHERE user_id = ANY(victims);
  DELETE FROM public.profiles WHERE user_id = ANY(victims);

  -- Borrar de auth.users
  DELETE FROM auth.users WHERE id = ANY(victims);
END $$;