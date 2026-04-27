-- 1) Actualizar precio por descarga a 650 XAF y añadir bonus extra para suscriptores
ALTER TABLE public.admin_financial_settings
  ADD COLUMN IF NOT EXISTS subscriber_extra_bonus_pct numeric NOT NULL DEFAULT 10.00;

UPDATE public.admin_financial_settings
SET wallet_price_per_download_xaf = 650,
    subscriber_extra_bonus_pct = 10.00,
    updated_at = now()
WHERE id = 1;

-- Si la fila no existe, crearla
INSERT INTO public.admin_financial_settings (id, wallet_price_per_download_xaf, subscriber_extra_bonus_pct)
SELECT 1, 650, 10.00
WHERE NOT EXISTS (SELECT 1 FROM public.admin_financial_settings WHERE id = 1);

-- 2) Reconfigurar plan Elite (4,99 € / 12 descargas mensuales: 10 base + 2 bonus)
UPDATE public.subscription_plans
SET name = 'YUSIOP Elite',
    description = '10 descargas mensuales + 2 bonus, lanzamiento express gratis y sin anuncios.',
    monthly_downloads = 12,
    price_eur_cents = 499,
    price_xaf = 3275,
    is_active = true,
    is_recommended = true,
    display_order = 0,
    updated_at = now()
WHERE code = 'elite';

-- Reordenar los demás planes para que Elite aparezca primero
UPDATE public.subscription_plans SET display_order = 1, is_recommended = false WHERE code = 'plus';
UPDATE public.subscription_plans SET display_order = 2, is_recommended = false WHERE code = 'pro';

-- 3) Helper: descargas estimadas a partir de un saldo XAF
CREATE OR REPLACE FUNCTION public.estimate_downloads(p_balance_xaf numeric)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    0,
    floor(
      COALESCE(p_balance_xaf, 0) /
      NULLIF((SELECT wallet_price_per_download_xaf FROM public.admin_financial_settings WHERE id = 1), 0)
    )::integer
  );
$$;

-- 4) Aplicar bonus de recarga (pack + extra suscriptor)
CREATE OR REPLACE FUNCTION public.apply_recharge_bonus(p_amount_eur numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_wallet public.user_wallets;
  v_settings public.admin_financial_settings;
  v_price_xaf integer;
  v_bonus_downloads integer := 0;
  v_has_active_sub boolean := false;
  v_bonus_xaf numeric := 0;
  v_new_balance numeric(14,2);
  v_tx_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  IF p_amount_eur IS NULL OR p_amount_eur <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  SELECT * INTO v_settings FROM public.admin_financial_settings WHERE id = 1;
  v_price_xaf := COALESCE(v_settings.wallet_price_per_download_xaf, 650);

  -- Bonus por pack
  IF p_amount_eur = 5 THEN
    v_bonus_downloads := 1;
  ELSIF p_amount_eur = 10 THEN
    v_bonus_downloads := 2;
  ELSIF p_amount_eur = 20 THEN
    v_bonus_downloads := 5;
  END IF;

  IF v_bonus_downloads = 0 THEN
    RETURN jsonb_build_object('success', true, 'bonus_downloads', 0, 'bonus_xaf', 0, 'message', 'no_bonus_for_this_pack');
  END IF;

  -- Bonus extra para suscriptores activos: +10 % redondeado hacia arriba (al menos +1 si aplica)
  SELECT EXISTS(
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = v_user_id AND status = 'active' AND current_period_end > now()
  ) INTO v_has_active_sub;

  IF v_has_active_sub AND COALESCE(v_settings.subscriber_extra_bonus_pct, 0) > 0 THEN
    v_bonus_downloads := v_bonus_downloads + GREATEST(1, ceil(v_bonus_downloads * v_settings.subscriber_extra_bonus_pct / 100.0)::integer);
  END IF;

  v_bonus_xaf := v_bonus_downloads * v_price_xaf;

  -- Bloquear wallet
  v_wallet := public.get_or_create_wallet(v_user_id);
  SELECT * INTO v_wallet FROM public.user_wallets WHERE id = v_wallet.id FOR UPDATE;

  UPDATE public.user_wallets
  SET balance = balance + v_bonus_xaf,
      total_recharged = total_recharged + v_bonus_xaf
  WHERE id = v_wallet.id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.wallet_transactions (
    user_id, wallet_id, type, amount, balance_after, status,
    reference, payment_method, description, metadata
  ) VALUES (
    v_user_id, v_wallet.id, 'bonus', v_bonus_xaf, v_new_balance, 'completed',
    'pack_' || p_amount_eur::text || 'eur', 'recharge_bonus',
    'Bonus por recarga de ' || p_amount_eur::text || ' € (' || v_bonus_downloads || ' descargas)',
    jsonb_build_object(
      'pack_eur', p_amount_eur,
      'bonus_downloads', v_bonus_downloads,
      'subscriber_boost_applied', v_has_active_sub
    )
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'bonus_downloads', v_bonus_downloads,
    'bonus_xaf', v_bonus_xaf,
    'new_balance', v_new_balance,
    'subscriber_boost_applied', v_has_active_sub,
    'transaction_id', v_tx_id
  );
END;
$$;

-- 5) Ampliar get_wallet_summary con descargas estimadas y suscripción
CREATE OR REPLACE FUNCTION public.get_wallet_summary(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_wallet public.user_wallets;
  v_transactions jsonb;
  v_settings public.admin_financial_settings;
  v_price_xaf integer;
  v_estimated integer;
  v_sub jsonb := NULL;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthenticated');
  END IF;

  v_wallet := public.get_or_create_wallet(v_user_id);

  SELECT * INTO v_settings FROM public.admin_financial_settings WHERE id = 1;
  v_price_xaf := COALESCE(v_settings.wallet_price_per_download_xaf, 650);
  v_estimated := public.estimate_downloads(v_wallet.balance);

  SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_transactions
  FROM (
    SELECT id, type, amount, balance_after, status, reference,
           payment_method, description, created_at
    FROM public.wallet_transactions
    WHERE user_id = v_user_id
    ORDER BY created_at DESC
    LIMIT p_limit
  ) t;

  SELECT jsonb_build_object(
    'id', us.id,
    'plan_code', sp.code,
    'plan_name', sp.name,
    'downloads_remaining', us.downloads_remaining,
    'monthly_downloads', us.monthly_downloads,
    'current_period_end', us.current_period_end,
    'cancel_at_period_end', us.cancel_at_period_end,
    'status', us.status
  ) INTO v_sub
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = v_user_id
    AND us.status = 'active'
    AND us.current_period_end > now()
  ORDER BY us.current_period_end DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'wallet', jsonb_build_object(
      'id', v_wallet.id,
      'balance', v_wallet.balance,
      'currency', v_wallet.currency,
      'total_recharged', v_wallet.total_recharged,
      'total_spent', v_wallet.total_spent,
      'updated_at', v_wallet.updated_at,
      'estimated_downloads', v_estimated,
      'value_per_download_xaf', v_price_xaf
    ),
    'subscription', v_sub,
    'transactions', v_transactions
  );
END;
$$;