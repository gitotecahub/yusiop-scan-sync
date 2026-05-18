
CREATE OR REPLACE FUNCTION public.request_artist_withdrawal(p_artist_id uuid, p_amount_xaf integer, p_method_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_settings public.admin_financial_settings%ROWTYPE;
  v_method public.artist_withdrawal_methods%ROWTYPE;
  v_summary jsonb;
  v_available integer;
  v_reserved integer;
  v_truly_available integer;
  v_last_request_at timestamptz;
  v_fee integer := 0;
  v_net integer;
  v_request_id uuid;
BEGIN
  IF NOT public.user_owns_artist(auth.uid(), p_artist_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Age restriction: only adults or teens with verified guardian may withdraw
  IF NOT public.user_can_withdraw(auth.uid()) THEN
    RAISE EXCEPTION 'age_restricted';
  END IF;

  SELECT * INTO v_settings FROM public.admin_financial_settings WHERE id = 1;
  IF NOT v_settings.withdrawals_enabled THEN
    RAISE EXCEPTION 'withdrawals_disabled';
  END IF;

  IF p_amount_xaf < v_settings.withdrawal_minimum_xaf THEN
    RAISE EXCEPTION 'amount_below_minimum';
  END IF;

  SELECT * INTO v_method FROM public.artist_withdrawal_methods WHERE id = p_method_id;
  IF v_method IS NULL OR v_method.artist_id <> p_artist_id THEN
    RAISE EXCEPTION 'invalid_method';
  END IF;
  IF v_method.verification_status <> 'verified' THEN
    RAISE EXCEPTION 'method_not_verified';
  END IF;

  SELECT MAX(created_at) INTO v_last_request_at
  FROM public.artist_withdrawal_requests
  WHERE artist_id = p_artist_id AND status NOT IN ('rejected','cancelled');
  IF v_last_request_at IS NOT NULL
     AND v_last_request_at + (v_settings.withdrawal_frequency_days || ' days')::interval > now() THEN
    RAISE EXCEPTION 'frequency_limit';
  END IF;

  PERFORM public.release_pending_earnings();

  SELECT public.get_artist_wallet_summary(p_artist_id) INTO v_summary;
  v_available := (v_summary->>'available_xaf')::integer;
  v_reserved := (v_summary->>'reserved_xaf')::integer;
  v_truly_available := v_available - v_reserved;

  IF p_amount_xaf > v_truly_available THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  IF EXISTS (SELECT 1 FROM public.artist_earnings WHERE artist_id = p_artist_id AND status = 'under_review') THEN
    RAISE EXCEPTION 'earnings_under_review';
  END IF;

  IF v_settings.withdrawal_fee_type = 'fixed' THEN
    v_fee := ROUND(v_settings.withdrawal_fee_value);
  ELSIF v_settings.withdrawal_fee_type = 'percent' THEN
    v_fee := ROUND(p_amount_xaf * v_settings.withdrawal_fee_value / 100.0);
  END IF;
  v_net := p_amount_xaf - v_fee;

  INSERT INTO public.artist_withdrawal_requests (
    artist_id, user_id, amount_requested_xaf, fee_amount_xaf, net_amount_xaf,
    payment_method_id, payment_method_snapshot, status
  ) VALUES (
    p_artist_id, auth.uid(), p_amount_xaf, v_fee, v_net,
    p_method_id, to_jsonb(v_method), 'requested'
  )
  RETURNING id INTO v_request_id;

  UPDATE public.artist_withdrawal_methods SET last_used_at = now() WHERE id = p_method_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    auth.uid(),
    'withdrawal_requested',
    'Solicitud de retiro enviada',
    'Tu solicitud por ' || p_amount_xaf::text || ' XAF está siendo revisada por el equipo financiero de YUSIOP.',
    jsonb_build_object('request_id', v_request_id, 'amount_xaf', p_amount_xaf)
  );

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT ur.user_id, 'admin_withdrawal_new',
         'Nueva solicitud de retiro',
         'Un artista ha solicitado un retiro de ' || p_amount_xaf::text || ' XAF (' || v_method.method_type::text || ').',
         jsonb_build_object('request_id', v_request_id, 'artist_id', p_artist_id, 'method_type', v_method.method_type::text)
  FROM public.user_roles ur WHERE ur.role = 'admin';

  RETURN jsonb_build_object('success', true, 'request_id', v_request_id);
END;
$function$;

-- Public RPC: consume parental verification token
CREATE OR REPLACE FUNCTION public.consume_parental_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;

  UPDATE public.profiles
  SET parental_verified = true,
      parental_verified_at = now(),
      parental_verification_token = NULL
  WHERE parental_verification_token = p_token
  RETURNING user_id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'token_not_found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_parental_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.consume_parental_token(text) TO anon, authenticated;
