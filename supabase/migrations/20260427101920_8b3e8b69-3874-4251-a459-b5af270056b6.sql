-- Credit wallet from a successful Stripe recharge (callable only with service role from webhook)
-- Uses an idempotency key (Stripe session id) stored in wallet_transactions.reference to avoid double credits.

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
BEGIN
  IF p_user_id IS NULL OR p_amount_xaf IS NULL OR p_amount_xaf <= 0 OR p_stripe_session_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_params');
  END IF;

  -- Idempotencia: si ya existe una transacción con esta referencia, devolver éxito sin duplicar
  SELECT id INTO v_existing
  FROM public.wallet_transactions
  WHERE reference = p_stripe_session_id
    AND type = 'recharge'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_processed', true, 'transaction_id', v_existing);
  END IF;

  v_wallet := public.get_or_create_wallet(p_user_id);
  SELECT * INTO v_wallet FROM public.user_wallets WHERE id = v_wallet.id FOR UPDATE;

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

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'new_balance', v_new_balance,
    'amount_xaf', p_amount_xaf
  );
END;
$$;

-- Solo el rol de servicio (webhooks) puede llamar a esta función
REVOKE ALL ON FUNCTION public.credit_wallet_recharge(uuid, numeric, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_wallet_recharge(uuid, numeric, numeric, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_recharge(uuid, numeric, numeric, text, text) TO service_role;