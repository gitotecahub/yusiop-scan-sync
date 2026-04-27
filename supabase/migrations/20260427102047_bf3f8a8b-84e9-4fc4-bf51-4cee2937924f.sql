CREATE OR REPLACE FUNCTION public.credit_wallet_recharge(
  p_user_id uuid,
  p_amount_xaf numeric,
  p_amount_eur numeric,
  p_stripe_session_id text,
  p_payment_intent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.user_wallets;
  v_new_balance numeric(14,2);
  v_tx_id uuid;
  v_existing uuid;
  v_settings public.admin_financial_settings;
  v_price_xaf integer;
  v_bonus_downloads integer := 0;
  v_has_active_sub boolean := false;
  v_bonus_xaf numeric := 0;
  v_bonus_tx_id uuid := NULL;
  v_post_bonus_balance numeric(14,2);
BEGIN
  IF p_user_id IS NULL OR p_amount_xaf IS NULL OR p_amount_xaf <= 0 OR p_stripe_session_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_params');
  END IF;

  -- Idempotencia
  SELECT id INTO v_existing
  FROM public.wallet_transactions
  WHERE reference = p_stripe_session_id AND type = 'recharge'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_processed', true, 'transaction_id', v_existing);
  END IF;

  v_wallet := public.get_or_create_wallet(p_user_id);
  SELECT * INTO v_wallet FROM public.user_wallets WHERE id = v_wallet.id FOR UPDATE;

  -- 1) Acreditar la recarga principal
  UPDATE public.user_wallets
  SET balance = balance + p_amount_xaf,
      total_recharged = total_recharged + p_amount_xaf
  WHERE id = v_wallet.id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.wallet_transactions (
    user_id, wallet_id, type, amount, balance_after, status,
    reference, payment_method, description, metadata
  ) VALUES (
    p_user_id, v_wallet.id, 'recharge', p_amount_xaf, v_new_balance, 'completed',
    p_stripe_session_id, 'stripe',
    'Recarga digital de ' || p_amount_eur::text || ' €',
    jsonb_build_object(
      'amount_eur', p_amount_eur,
      'stripe_session_id', p_stripe_session_id,
      'stripe_payment_intent', p_payment_intent
    )
  )
  RETURNING id INTO v_tx_id;

  -- 2) Calcular bonus por pack
  SELECT * INTO v_settings FROM public.admin_financial_settings WHERE id = 1;
  v_price_xaf := COALESCE(v_settings.wallet_price_per_download_xaf, 650);

  IF p_amount_eur = 5 THEN v_bonus_downloads := 1;
  ELSIF p_amount_eur = 10 THEN v_bonus_downloads := 2;
  ELSIF p_amount_eur = 20 THEN v_bonus_downloads := 5;
  END IF;

  v_post_bonus_balance := v_new_balance;

  IF v_bonus_downloads > 0 THEN
    -- Boost extra para suscriptores
    SELECT EXISTS(
      SELECT 1 FROM public.user_subscriptions
      WHERE user_id = p_user_id AND status = 'active' AND current_period_end > now()
    ) INTO v_has_active_sub;

    IF v_has_active_sub AND COALESCE(v_settings.subscriber_extra_bonus_pct, 0) > 0 THEN
      v_bonus_downloads := v_bonus_downloads + GREATEST(
        1,
        ceil(v_bonus_downloads * v_settings.subscriber_extra_bonus_pct / 100.0)::integer
      );
    END IF;

    v_bonus_xaf := v_bonus_downloads * v_price_xaf;

    UPDATE public.user_wallets
    SET balance = balance + v_bonus_xaf,
        total_recharged = total_recharged + v_bonus_xaf
    WHERE id = v_wallet.id
    RETURNING balance INTO v_post_bonus_balance;

    INSERT INTO public.wallet_transactions (
      user_id, wallet_id, type, amount, balance_after, status,
      reference, payment_method, description, metadata
    ) VALUES (
      p_user_id, v_wallet.id, 'bonus', v_bonus_xaf, v_post_bonus_balance, 'completed',
      'pack_' || p_amount_eur::text || 'eur_' || p_stripe_session_id,
      'recharge_bonus',
      'Bonus por recarga de ' || p_amount_eur::text || ' € (' || v_bonus_downloads || ' descargas)',
      jsonb_build_object(
        'pack_eur', p_amount_eur,
        'bonus_downloads', v_bonus_downloads,
        'subscriber_boost_applied', v_has_active_sub,
        'parent_recharge_tx', v_tx_id
      )
    )
    RETURNING id INTO v_bonus_tx_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'bonus_transaction_id', v_bonus_tx_id,
    'amount_xaf', p_amount_xaf,
    'bonus_downloads', v_bonus_downloads,
    'bonus_xaf', v_bonus_xaf,
    'subscriber_boost_applied', v_has_active_sub,
    'new_balance', v_post_bonus_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.credit_wallet_recharge(uuid, numeric, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_wallet_recharge(uuid, numeric, numeric, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_recharge(uuid, numeric, numeric, text, text) TO service_role;