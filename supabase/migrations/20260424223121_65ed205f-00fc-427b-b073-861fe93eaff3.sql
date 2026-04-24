-- =========================================================================
-- 1. ENUMS
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_visibility') THEN
    CREATE TYPE public.subscription_visibility AS ENUM ('off', 'soft_launch', 'on');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_subscription_status') THEN
    CREATE TYPE public.user_subscription_status AS ENUM ('active', 'cancelled', 'expired', 'past_due');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan_code') THEN
    CREATE TYPE public.subscription_plan_code AS ENUM ('plus', 'pro', 'elite');
  END IF;
END$$;

-- =========================================================================
-- 2. SUBSCRIPTION_PLANS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code public.subscription_plan_code NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  monthly_downloads integer NOT NULL,
  price_xaf integer NOT NULL,
  price_eur_cents integer NOT NULL, -- equivalente cobrado por Stripe
  stripe_price_id text,             -- opcional: si se crea un Price en Stripe
  is_active boolean NOT NULL DEFAULT true,
  is_recommended boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active plans" ON public.subscription_plans;
CREATE POLICY "Anyone can read active plans"
  ON public.subscription_plans FOR SELECT
  TO public
  USING (is_active = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage plans" ON public.subscription_plans;
CREATE POLICY "Admins manage plans"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Datos iniciales (3 planes). Equivalente XAF→EUR aproximado (1 EUR ≈ 655 XAF).
INSERT INTO public.subscription_plans
  (code, name, description, monthly_downloads, price_xaf, price_eur_cents, is_recommended, display_order)
VALUES
  ('plus',  'YUSIOP Plus',  'Para usuarios ocasionales',  6,  3000, 458,  false, 1),
  ('pro',   'YUSIOP Pro',   'Para usuarios activos',     12,  5000, 763,  true,  2),
  ('elite', 'YUSIOP Elite', 'Para usuarios intensivos',  20,  8500, 1297, false, 3)
ON CONFLICT (code) DO NOTHING;

-- =========================================================================
-- 3. USER_SUBSCRIPTIONS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status public.user_subscription_status NOT NULL DEFAULT 'active',
  start_date timestamptz NOT NULL DEFAULT now(),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  renewal_date timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  downloads_remaining integer NOT NULL DEFAULT 0,
  monthly_downloads integer NOT NULL,    -- snapshot del plan al contratar
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  last_event_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_active_subscription
  ON public.user_subscriptions(user_id)
  WHERE status = 'active';

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own subscription" ON public.user_subscriptions;
CREATE POLICY "Users view own subscription"
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins manage subscriptions"
  ON public.user_subscriptions FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- =========================================================================
-- 4. FEATURE_FLAGS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled_state public.subscription_visibility NOT NULL DEFAULT 'off',
  whitelist_user_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  rules jsonb NOT NULL DEFAULT '{
    "min_downloads": null,
    "active_in_last_days": null,
    "show_to_users_without_credits": false,
    "countries": []
  }'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage feature flags" ON public.feature_flags;
CREATE POLICY "Admins manage feature flags"
  ON public.feature_flags FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.feature_flags (key, enabled_state)
VALUES ('subscriptions', 'off')
ON CONFLICT (key) DO NOTHING;

-- =========================================================================
-- 5. SUBSCRIPTION_DOWNLOAD_ATTEMPTS (intentos sin saldo)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.subscription_download_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  song_id uuid,
  reason text NOT NULL DEFAULT 'no_credits', -- no_credits, no_card, etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_attempts_user ON public.subscription_download_attempts(user_id, created_at DESC);

ALTER TABLE public.subscription_download_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own attempts" ON public.subscription_download_attempts;
CREATE POLICY "Users insert own attempts"
  ON public.subscription_download_attempts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users view own attempts" ON public.subscription_download_attempts;
CREATE POLICY "Users view own attempts"
  ON public.subscription_download_attempts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- =========================================================================
-- 6. SONGS: separación catálogo premium vs base
-- =========================================================================
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_locked_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_songs_premium ON public.songs(is_premium);

-- =========================================================================
-- 7. FUNCIÓN: visibilidad de suscripción para un usuario
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_subscription_visibility(_user_id uuid)
RETURNS TABLE(visible boolean, state public.subscription_visibility, reason text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  flag public.feature_flags%ROWTYPE;
  user_downloads_count integer;
  has_active_in_window boolean;
  has_attempts boolean;
BEGIN
  SELECT * INTO flag FROM public.feature_flags WHERE key = 'subscriptions';

  IF flag IS NULL THEN
    RETURN QUERY SELECT false, 'off'::public.subscription_visibility, 'no_flag';
    RETURN;
  END IF;

  IF flag.enabled_state = 'off' THEN
    RETURN QUERY SELECT false, flag.enabled_state, 'global_off';
    RETURN;
  END IF;

  IF flag.enabled_state = 'on' THEN
    RETURN QUERY SELECT true, flag.enabled_state, 'global_on';
    RETURN;
  END IF;

  -- soft_launch: comprobar reglas
  IF _user_id IS NULL THEN
    RETURN QUERY SELECT false, flag.enabled_state, 'no_user';
    RETURN;
  END IF;

  -- Whitelist
  IF _user_id = ANY (flag.whitelist_user_ids) THEN
    RETURN QUERY SELECT true, flag.enabled_state, 'whitelist';
    RETURN;
  END IF;

  -- Regla: descargas mínimas
  IF (flag.rules->>'min_downloads') IS NOT NULL THEN
    SELECT COUNT(*)::int INTO user_downloads_count
    FROM public.user_downloads
    WHERE user_id = _user_id;
    IF user_downloads_count >= (flag.rules->>'min_downloads')::int THEN
      RETURN QUERY SELECT true, flag.enabled_state, 'rule_min_downloads';
      RETURN;
    END IF;
  END IF;

  -- Regla: usuarios que han intentado descargar sin saldo
  IF COALESCE((flag.rules->>'show_to_users_without_credits')::boolean, false) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.subscription_download_attempts
      WHERE user_id = _user_id
        AND created_at > now() - interval '30 days'
    ) INTO has_attempts;
    IF has_attempts THEN
      RETURN QUERY SELECT true, flag.enabled_state, 'rule_no_credits_attempts';
      RETURN;
    END IF;
  END IF;

  -- Regla: actividad reciente (días)
  IF (flag.rules->>'active_in_last_days') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_downloads
      WHERE user_id = _user_id
        AND downloaded_at > now() - ((flag.rules->>'active_in_last_days')::int || ' days')::interval
    ) INTO has_active_in_window;
    IF has_active_in_window THEN
      RETURN QUERY SELECT true, flag.enabled_state, 'rule_active_window';
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT false, flag.enabled_state, 'no_match';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscription_visibility(uuid) TO authenticated, anon;

-- =========================================================================
-- 8. FUNCIÓN: registrar intento sin saldo
-- =========================================================================
CREATE OR REPLACE FUNCTION public.register_subscription_attempt(
  p_song_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'no_credits'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.subscription_download_attempts (user_id, song_id, reason)
  VALUES (auth.uid(), p_song_id, COALESCE(p_reason, 'no_credits'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_subscription_attempt(uuid, text) TO authenticated;

-- =========================================================================
-- 9. FUNCIÓN: consumir crédito de suscripción
-- =========================================================================
CREATE OR REPLACE FUNCTION public.consume_subscription_credit(
  p_user_id uuid,
  p_song_id uuid
)
RETURNS TABLE(success boolean, message text, credits_left integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub public.user_subscriptions%ROWTYPE;
  song_is_premium boolean;
BEGIN
  -- La canción debe NO ser premium para usar suscripción
  SELECT is_premium INTO song_is_premium FROM public.songs WHERE id = p_song_id;
  IF song_is_premium IS NULL THEN
    RETURN QUERY SELECT false, 'song_not_found'::text, 0;
    RETURN;
  END IF;
  IF song_is_premium THEN
    RETURN QUERY SELECT false, 'premium_song_requires_card'::text, 0;
    RETURN;
  END IF;

  SELECT * INTO sub
  FROM public.user_subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  IF sub.id IS NULL THEN
    RETURN QUERY SELECT false, 'no_active_subscription'::text, 0;
    RETURN;
  END IF;

  IF sub.current_period_end < now() THEN
    UPDATE public.user_subscriptions
    SET status = 'expired', updated_at = now()
    WHERE id = sub.id;
    RETURN QUERY SELECT false, 'subscription_expired'::text, 0;
    RETURN;
  END IF;

  IF sub.downloads_remaining <= 0 THEN
    RETURN QUERY SELECT false, 'monthly_limit_reached'::text, 0;
    RETURN;
  END IF;

  UPDATE public.user_subscriptions
  SET downloads_remaining = downloads_remaining - 1,
      last_event_at = now(),
      updated_at = now()
  WHERE id = sub.id;

  RETURN QUERY SELECT true, 'ok'::text, (sub.downloads_remaining - 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_subscription_credit(uuid, uuid) TO authenticated;

-- =========================================================================
-- 10. FUNCIÓN: métricas globales (solo admin)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.subscription_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count integer;
  total_users integer;
  monthly_revenue_xaf bigint;
  by_plan jsonb;
  attempts_30d integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT COUNT(*) INTO active_count
  FROM public.user_subscriptions WHERE status = 'active';

  SELECT COUNT(DISTINCT user_id) INTO total_users FROM public.profiles;

  SELECT COALESCE(SUM(p.price_xaf), 0) INTO monthly_revenue_xaf
  FROM public.user_subscriptions us
  JOIN public.subscription_plans p ON p.id = us.plan_id
  WHERE us.status = 'active';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'plan_code', p.code,
    'plan_name', p.name,
    'subscribers', cnt,
    'revenue_xaf', revenue
  )), '[]'::jsonb) INTO by_plan
  FROM (
    SELECT p.code, p.name, COUNT(us.id) AS cnt, COALESCE(SUM(p.price_xaf),0) AS revenue
    FROM public.subscription_plans p
    LEFT JOIN public.user_subscriptions us
      ON us.plan_id = p.id AND us.status = 'active'
    GROUP BY p.code, p.name
  ) p;

  SELECT COUNT(*) INTO attempts_30d
  FROM public.subscription_download_attempts
  WHERE created_at > now() - interval '30 days';

  RETURN jsonb_build_object(
    'active_subscribers', active_count,
    'total_users', total_users,
    'conversion_rate', CASE WHEN total_users > 0 THEN ROUND((active_count::numeric / total_users::numeric) * 100, 2) ELSE 0 END,
    'monthly_revenue_xaf', monthly_revenue_xaf,
    'by_plan', by_plan,
    'no_credit_attempts_30d', attempts_30d
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.subscription_metrics() TO authenticated;

-- =========================================================================
-- 11. Trigger updated_at
-- =========================================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_plans_updated ON public.subscription_plans;
CREATE TRIGGER trg_subscription_plans_updated
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_user_subscriptions_updated ON public.user_subscriptions;
CREATE TRIGGER trg_user_subscriptions_updated
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();