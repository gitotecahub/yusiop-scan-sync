
-- 1) Actualizar reglas por defecto del feature flag de suscripciones
UPDATE public.feature_flags
SET rules = jsonb_build_object(
  'rule_high_activity', jsonb_build_object('enabled', true, 'min_downloads', 5),
  'rule_no_credits', jsonb_build_object('enabled', true, 'days', 7),
  'rule_buyers', jsonb_build_object('enabled', true, 'min_purchases', 2, 'days', 30),
  'rule_active_users', jsonb_build_object('enabled', true, 'min_logins', 3, 'days', 7)
)
WHERE key = 'subscriptions_visibility';

-- Si no existe el flag, crearlo
INSERT INTO public.feature_flags (key, enabled_state, whitelist_user_ids, rules)
VALUES (
  'subscriptions_visibility',
  'off',
  ARRAY[]::uuid[],
  jsonb_build_object(
    'rule_high_activity', jsonb_build_object('enabled', true, 'min_downloads', 5),
    'rule_no_credits', jsonb_build_object('enabled', true, 'days', 7),
    'rule_buyers', jsonb_build_object('enabled', true, 'min_purchases', 2, 'days', 30),
    'rule_active_users', jsonb_build_object('enabled', true, 'min_logins', 3, 'days', 7)
  )
)
ON CONFLICT (key) DO NOTHING;

-- 2) Reemplazar la función de visibilidad con las 4 reglas
CREATE OR REPLACE FUNCTION public.get_subscription_visibility(_user_id uuid)
RETURNS TABLE(visible boolean, state public.subscription_visibility, reason text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flag public.feature_flags%ROWTYPE;
  v_rules jsonb;
  v_rule jsonb;
  v_count integer;
BEGIN
  SELECT * INTO v_flag FROM public.feature_flags WHERE key = 'subscriptions_visibility';

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'off'::public.subscription_visibility, 'no_flag'::text;
    RETURN;
  END IF;

  -- Estado OFF: nadie ve nada
  IF v_flag.enabled_state = 'off' THEN
    RETURN QUERY SELECT false, 'off'::public.subscription_visibility, 'disabled'::text;
    RETURN;
  END IF;

  -- Estado ON: todos ven
  IF v_flag.enabled_state = 'on' THEN
    RETURN QUERY SELECT true, 'on'::public.subscription_visibility, 'global_on'::text;
    RETURN;
  END IF;

  -- Estado SOFT_LAUNCH: aplicar whitelist + reglas
  IF _user_id IS NULL THEN
    RETURN QUERY SELECT false, 'soft_launch'::public.subscription_visibility, 'anonymous'::text;
    RETURN;
  END IF;

  -- Whitelist siempre gana
  IF _user_id = ANY (v_flag.whitelist_user_ids) THEN
    RETURN QUERY SELECT true, 'soft_launch'::public.subscription_visibility, 'whitelist'::text;
    RETURN;
  END IF;

  v_rules := COALESCE(v_flag.rules, '{}'::jsonb);

  -- Regla 1: Alta actividad (más de N descargas totales)
  v_rule := v_rules->'rule_high_activity';
  IF COALESCE((v_rule->>'enabled')::boolean, false) THEN
    SELECT COUNT(*) INTO v_count
    FROM public.user_downloads
    WHERE user_id = _user_id;
    IF v_count > COALESCE((v_rule->>'min_downloads')::integer, 5) THEN
      RETURN QUERY SELECT true, 'soft_launch'::public.subscription_visibility, 'rule_high_activity'::text;
      RETURN;
    END IF;
  END IF;

  -- Regla 2: Intentos de descarga sin saldo en los últimos N días
  v_rule := v_rules->'rule_no_credits';
  IF COALESCE((v_rule->>'enabled')::boolean, false) THEN
    SELECT COUNT(*) INTO v_count
    FROM public.subscription_download_attempts
    WHERE user_id = _user_id
      AND created_at >= now() - (COALESCE((v_rule->>'days')::integer, 7) || ' days')::interval;
    IF v_count > 0 THEN
      RETURN QUERY SELECT true, 'soft_launch'::public.subscription_visibility, 'rule_no_credits'::text;
      RETURN;
    END IF;
  END IF;

  -- Regla 3: Compradores (≥ N tarjetas pagadas en últimos N días)
  v_rule := v_rules->'rule_buyers';
  IF COALESCE((v_rule->>'enabled')::boolean, false) THEN
    SELECT COUNT(*) INTO v_count
    FROM public.card_purchases
    WHERE buyer_user_id = _user_id
      AND status = 'paid'
      AND created_at >= now() - (COALESCE((v_rule->>'days')::integer, 30) || ' days')::interval;
    IF v_count >= COALESCE((v_rule->>'min_purchases')::integer, 2) THEN
      RETURN QUERY SELECT true, 'soft_launch'::public.subscription_visibility, 'rule_buyers'::text;
      RETURN;
    END IF;
  END IF;

  -- Regla 4: Usuarios activos (≥ N sesiones en últimos N días)
  -- Aproximamos sesiones con user_sessions creadas en la ventana
  v_rule := v_rules->'rule_active_users';
  IF COALESCE((v_rule->>'enabled')::boolean, false) THEN
    SELECT COUNT(*) INTO v_count
    FROM public.user_sessions us
    JOIN public.users u ON u.email = us.user_email
    WHERE u.id = _user_id
      AND us.created_at >= now() - (COALESCE((v_rule->>'days')::integer, 7) || ' days')::interval;
    IF v_count >= COALESCE((v_rule->>'min_logins')::integer, 3) THEN
      RETURN QUERY SELECT true, 'soft_launch'::public.subscription_visibility, 'rule_active_users'::text;
      RETURN;
    END IF;
  END IF;

  -- Ninguna regla cumplida
  RETURN QUERY SELECT false, 'soft_launch'::public.subscription_visibility, 'no_match'::text;
END;
$$;
