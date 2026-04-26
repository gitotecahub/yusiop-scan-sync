-- ============================================================================
-- CEO CENTER: Strategic analytics RPCs
-- All functions are SECURITY DEFINER, restricted to super-admins via is_admin()
-- ============================================================================

-- 1. Health score
CREATE OR REPLACE FUNCTION public.get_ceo_health_score(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_start timestamptz := v_now - (p_days || ' days')::interval;
  v_prev_start timestamptz := v_now - (p_days * 2 || ' days')::interval;

  v_revenue_now numeric := 0;
  v_revenue_prev numeric := 0;
  v_users_now integer := 0;
  v_users_prev integer := 0;
  v_downloads_now integer := 0;
  v_downloads_prev integer := 0;
  v_fraud_count integer := 0;
  v_active_subs integer := 0;
  v_active_artists integer := 0;

  v_score numeric := 50;
  v_status text;
  v_message text;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COALESCE(SUM(amount_cents),0)/100.0 INTO v_revenue_now
    FROM card_purchases WHERE status='paid' AND created_at >= v_start;
  SELECT COALESCE(SUM(amount_cents),0)/100.0 INTO v_revenue_prev
    FROM card_purchases WHERE status='paid' AND created_at >= v_prev_start AND created_at < v_start;

  SELECT COUNT(*) INTO v_users_now FROM profiles WHERE created_at >= v_start;
  SELECT COUNT(*) INTO v_users_prev FROM profiles WHERE created_at >= v_prev_start AND created_at < v_start;

  SELECT COUNT(*) INTO v_downloads_now FROM user_downloads WHERE downloaded_at >= v_start;
  SELECT COUNT(*) INTO v_downloads_prev FROM user_downloads WHERE downloaded_at >= v_prev_start AND downloaded_at < v_start;

  SELECT COUNT(*) INTO v_fraud_count FROM user_fraud_score WHERE is_suspicious = true;
  SELECT COUNT(*) INTO v_active_subs FROM user_subscriptions WHERE status='active';
  SELECT COUNT(DISTINCT artist_id) INTO v_active_artists
    FROM songs s WHERE EXISTS (SELECT 1 FROM user_downloads d WHERE d.song_id=s.id AND d.downloaded_at >= v_start);

  -- Score components
  v_score := 50;
  -- Revenue growth (max +/-20)
  IF v_revenue_prev > 0 THEN
    v_score := v_score + LEAST(20, GREATEST(-20, ((v_revenue_now - v_revenue_prev)/v_revenue_prev)*40));
  ELSIF v_revenue_now > 0 THEN
    v_score := v_score + 15;
  END IF;
  -- User growth (max +/-15)
  IF v_users_prev > 0 THEN
    v_score := v_score + LEAST(15, GREATEST(-15, ((v_users_now::numeric - v_users_prev)/v_users_prev)*30));
  ELSIF v_users_now > 0 THEN
    v_score := v_score + 10;
  END IF;
  -- Downloads (max +/-15)
  IF v_downloads_prev > 0 THEN
    v_score := v_score + LEAST(15, GREATEST(-15, ((v_downloads_now::numeric - v_downloads_prev)/v_downloads_prev)*30));
  ELSIF v_downloads_now > 0 THEN
    v_score := v_score + 8;
  END IF;
  -- Fraud penalty
  v_score := v_score - LEAST(20, v_fraud_count * 2);
  -- Active subs bonus (small)
  v_score := v_score + LEAST(10, v_active_subs * 0.5);

  v_score := GREATEST(0, LEAST(100, v_score));

  v_status := CASE
    WHEN v_score >= 80 THEN 'excellent'
    WHEN v_score >= 60 THEN 'stable'
    WHEN v_score >= 40 THEN 'attention'
    ELSE 'risk'
  END;

  v_message := CASE v_status
    WHEN 'excellent' THEN 'La plataforma muestra crecimiento positivo y baja incidencia de fraude.'
    WHEN 'stable' THEN 'Indicadores estables. Hay margen para impulsar campañas de crecimiento.'
    WHEN 'attention' THEN 'Algunos indicadores piden atención. Revisa fraude y tendencias de ingresos.'
    ELSE 'Riesgo elevado. Revisa fraude, descargas y suscripciones cuanto antes.'
  END;

  RETURN jsonb_build_object(
    'score', ROUND(v_score),
    'status', v_status,
    'message', v_message,
    'components', jsonb_build_object(
      'revenue_now', v_revenue_now,
      'revenue_prev', v_revenue_prev,
      'users_now', v_users_now,
      'users_prev', v_users_prev,
      'downloads_now', v_downloads_now,
      'downloads_prev', v_downloads_prev,
      'fraud_flags', v_fraud_count,
      'active_subscriptions', v_active_subs,
      'active_artists', v_active_artists
    )
  );
END;
$$;

-- 2. KPIs
CREATE OR REPLACE FUNCTION public.get_ceo_kpis(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_start timestamptz := v_now - (p_days || ' days')::interval;
  v_prev_start timestamptz := v_now - (p_days * 2 || ' days')::interval;

  v_card_rev numeric := 0;
  v_card_rev_prev numeric := 0;
  v_sub_rev numeric := 0;
  v_sub_rev_prev numeric := 0;
  v_express_rev numeric := 0;
  v_express_rev_prev numeric := 0;

  v_downloads integer := 0;
  v_downloads_prev integer := 0;
  v_active_users integer := 0;
  v_active_users_prev integer := 0;
  v_active_artists integer := 0;
  v_card_count integer := 0;

  v_avg_ticket numeric := 0;
  v_total_users integer := 0;
  v_paying_users integer := 0;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Card purchases revenue
  SELECT COALESCE(SUM(amount_cents),0)/100.0, COUNT(*)
    INTO v_card_rev, v_card_count
    FROM card_purchases WHERE status='paid' AND created_at >= v_start;
  SELECT COALESCE(SUM(amount_cents),0)/100.0 INTO v_card_rev_prev
    FROM card_purchases WHERE status='paid' AND created_at >= v_prev_start AND created_at < v_start;

  -- Subscription revenue (estimate from active subs * plan price, prorated to period)
  SELECT COALESCE(SUM(sp.price_eur_cents),0)/100.0 * (p_days::numeric / 30.0) INTO v_sub_rev
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.status='active' AND us.created_at <= v_now AND (us.cancelled_at IS NULL OR us.cancelled_at >= v_start);
  SELECT COALESCE(SUM(sp.price_eur_cents),0)/100.0 * (p_days::numeric / 30.0) INTO v_sub_rev_prev
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.status='active' AND us.created_at < v_start;

  -- Express releases revenue (XAF -> EUR approximate /655)
  SELECT COALESCE(SUM(express_price_xaf),0)/655.0 INTO v_express_rev
    FROM song_submissions WHERE express_paid_at >= v_start;
  SELECT COALESCE(SUM(express_price_xaf),0)/655.0 INTO v_express_rev_prev
    FROM song_submissions WHERE express_paid_at >= v_prev_start AND express_paid_at < v_start;

  SELECT COUNT(*) INTO v_downloads FROM user_downloads WHERE downloaded_at >= v_start;
  SELECT COUNT(*) INTO v_downloads_prev FROM user_downloads WHERE downloaded_at >= v_prev_start AND downloaded_at < v_start;

  SELECT COUNT(DISTINCT user_id) INTO v_active_users FROM user_downloads WHERE downloaded_at >= v_start AND user_id IS NOT NULL;
  SELECT COUNT(DISTINCT user_id) INTO v_active_users_prev FROM user_downloads WHERE downloaded_at >= v_prev_start AND downloaded_at < v_start AND user_id IS NOT NULL;

  SELECT COUNT(DISTINCT s.artist_id) INTO v_active_artists
    FROM songs s WHERE EXISTS (SELECT 1 FROM user_downloads d WHERE d.song_id=s.id AND d.downloaded_at >= v_start);

  IF v_card_count > 0 THEN
    v_avg_ticket := v_card_rev / v_card_count;
  END IF;

  SELECT COUNT(*) INTO v_total_users FROM profiles;
  SELECT COUNT(DISTINCT buyer_user_id) INTO v_paying_users FROM card_purchases WHERE status='paid';

  RETURN jsonb_build_object(
    'period_days', p_days,
    'revenue_total', ROUND((v_card_rev + v_sub_rev + v_express_rev)::numeric, 2),
    'revenue_total_prev', ROUND((v_card_rev_prev + v_sub_rev_prev + v_express_rev_prev)::numeric, 2),
    'revenue_cards', ROUND(v_card_rev::numeric, 2),
    'revenue_cards_prev', ROUND(v_card_rev_prev::numeric, 2),
    'revenue_subscriptions', ROUND(v_sub_rev::numeric, 2),
    'revenue_subscriptions_prev', ROUND(v_sub_rev_prev::numeric, 2),
    'revenue_express', ROUND(v_express_rev::numeric, 2),
    'revenue_express_prev', ROUND(v_express_rev_prev::numeric, 2),
    'downloads', v_downloads,
    'downloads_prev', v_downloads_prev,
    'active_users', v_active_users,
    'active_users_prev', v_active_users_prev,
    'active_artists', v_active_artists,
    'card_count', v_card_count,
    'avg_ticket', ROUND(v_avg_ticket::numeric, 2),
    'conversion_rate', CASE WHEN v_total_users > 0 THEN ROUND((v_paying_users::numeric / v_total_users) * 100, 2) ELSE 0 END,
    'estimated_profit', ROUND(((v_card_rev + v_sub_rev + v_express_rev) * 0.55)::numeric, 2)
  );
END;
$$;

-- 3. Revenue breakdown
CREATE OR REPLACE FUNCTION public.get_ceo_revenue_breakdown(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kpis jsonb;
  v_total numeric;
  v_cards numeric;
  v_subs numeric;
  v_express numeric;
  v_cards_prev numeric;
  v_subs_prev numeric;
  v_express_prev numeric;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_kpis := get_ceo_kpis(p_days);
  v_cards := (v_kpis->>'revenue_cards')::numeric;
  v_subs := (v_kpis->>'revenue_subscriptions')::numeric;
  v_express := (v_kpis->>'revenue_express')::numeric;
  v_cards_prev := (v_kpis->>'revenue_cards_prev')::numeric;
  v_subs_prev := (v_kpis->>'revenue_subscriptions_prev')::numeric;
  v_express_prev := (v_kpis->>'revenue_express_prev')::numeric;
  v_total := GREATEST(v_cards + v_subs + v_express, 0.01);

  RETURN jsonb_build_array(
    jsonb_build_object(
      'engine', 'cards', 'label', 'Tarjetas QR', 'revenue', v_cards,
      'percent', ROUND((v_cards / v_total)*100, 1),
      'trend', CASE WHEN v_cards_prev > 0 THEN ROUND(((v_cards - v_cards_prev)/v_cards_prev)*100, 1) ELSE NULL END,
      'recommendation', CASE
        WHEN v_cards_prev > 0 AND ((v_cards - v_cards_prev)/v_cards_prev) < -0.15 THEN 'Activa una campaña de promoción de tarjetas premium.'
        WHEN v_cards_prev > 0 AND ((v_cards - v_cards_prev)/v_cards_prev) > 0.20 THEN 'Mantén la inversión en distribución de tarjetas.'
        ELSE 'Estable. Considera testear nuevos canales de venta.'
      END
    ),
    jsonb_build_object(
      'engine', 'subscriptions', 'label', 'Suscripciones', 'revenue', v_subs,
      'percent', ROUND((v_subs / v_total)*100, 1),
      'trend', CASE WHEN v_subs_prev > 0 THEN ROUND(((v_subs - v_subs_prev)/v_subs_prev)*100, 1) ELSE NULL END,
      'recommendation', CASE
        WHEN v_subs_prev > 0 AND ((v_subs - v_subs_prev)/v_subs_prev) < -0.10 THEN 'Suscripciones cayendo. Lanza campaña de re-engagement.'
        WHEN v_subs = 0 THEN 'Activa la visibilidad de suscripciones para más usuarios.'
        ELSE 'Buena base recurrente. Refuerza el plan recomendado.'
      END
    ),
    jsonb_build_object(
      'engine', 'express', 'label', 'Lanzamientos express', 'revenue', v_express,
      'percent', ROUND((v_express / v_total)*100, 1),
      'trend', CASE WHEN v_express_prev > 0 THEN ROUND(((v_express - v_express_prev)/v_express_prev)*100, 1) ELSE NULL END,
      'recommendation', CASE
        WHEN v_express = 0 THEN 'Promociona el servicio express entre artistas con envíos pendientes.'
        ELSE 'Servicio rentable. Considera ofrecer más tiers.'
      END
    )
  );
END;
$$;

-- 4. Top songs
CREATE OR REPLACE FUNCTION public.get_ceo_top_songs(p_days integer DEFAULT 30, p_limit integer DEFAULT 10)
RETURNS TABLE (
  song_id uuid,
  title text,
  artist_name text,
  downloads_now integer,
  downloads_prev integer,
  growth_pct numeric,
  estimated_revenue numeric,
  ai_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_start timestamptz := v_now - (p_days || ' days')::interval;
  v_prev_start timestamptz := v_now - (p_days*2 || ' days')::interval;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  WITH now_counts AS (
    SELECT d.song_id, COUNT(*)::integer AS cnt
    FROM user_downloads d WHERE d.downloaded_at >= v_start
    GROUP BY d.song_id
  ),
  prev_counts AS (
    SELECT d.song_id, COUNT(*)::integer AS cnt
    FROM user_downloads d WHERE d.downloaded_at >= v_prev_start AND d.downloaded_at < v_start
    GROUP BY d.song_id
  )
  SELECT
    s.id,
    s.title,
    a.name,
    COALESCE(n.cnt,0),
    COALESCE(p.cnt,0),
    CASE
      WHEN COALESCE(p.cnt,0) > 0 THEN ROUND(((COALESCE(n.cnt,0)::numeric - p.cnt)/p.cnt)*100, 1)
      WHEN COALESCE(n.cnt,0) > 0 THEN 100.0
      ELSE 0
    END,
    ROUND(COALESCE(n.cnt,0) * 0.25, 2), -- estimated revenue per download
    CASE
      WHEN COALESCE(p.cnt,0) > 0 AND ((COALESCE(n.cnt,0)::numeric - p.cnt)/p.cnt) >= 0.60 THEN 'viral'
      WHEN COALESCE(p.cnt,0) > 0 AND ((COALESCE(n.cnt,0)::numeric - p.cnt)/p.cnt) >= 0.30 THEN 'promote'
      WHEN COALESCE(p.cnt,0) > 0 AND ((COALESCE(n.cnt,0)::numeric - p.cnt)/p.cnt) <= -0.25 THEN 'review'
      ELSE 'normal'
    END
  FROM songs s
  JOIN artists a ON a.id = s.artist_id
  LEFT JOIN now_counts n ON n.song_id = s.id
  LEFT JOIN prev_counts p ON p.song_id = s.id
  WHERE COALESCE(n.cnt,0) > 0
  ORDER BY COALESCE(n.cnt,0) DESC
  LIMIT p_limit;
END;
$$;

-- 5. Top artists
CREATE OR REPLACE FUNCTION public.get_ceo_top_artists(p_days integer DEFAULT 30, p_limit integer DEFAULT 10)
RETURNS TABLE (
  artist_id uuid,
  name text,
  active_songs integer,
  downloads_now integer,
  downloads_prev integer,
  growth_pct numeric,
  estimated_revenue numeric,
  recommendation text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_start timestamptz := v_now - (p_days || ' days')::interval;
  v_prev_start timestamptz := v_now - (p_days*2 || ' days')::interval;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  WITH downloads_now AS (
    SELECT s.artist_id, COUNT(*)::integer AS cnt
    FROM user_downloads d JOIN songs s ON s.id=d.song_id
    WHERE d.downloaded_at >= v_start
    GROUP BY s.artist_id
  ),
  downloads_prev AS (
    SELECT s.artist_id, COUNT(*)::integer AS cnt
    FROM user_downloads d JOIN songs s ON s.id=d.song_id
    WHERE d.downloaded_at >= v_prev_start AND d.downloaded_at < v_start
    GROUP BY s.artist_id
  ),
  song_counts AS (
    SELECT artist_id, COUNT(*)::integer AS cnt FROM songs GROUP BY artist_id
  )
  SELECT
    a.id,
    a.name,
    COALESCE(sc.cnt, 0),
    COALESCE(n.cnt, 0),
    COALESCE(p.cnt, 0),
    CASE
      WHEN COALESCE(p.cnt,0) > 0 THEN ROUND(((COALESCE(n.cnt,0)::numeric - p.cnt)/p.cnt)*100, 1)
      WHEN COALESCE(n.cnt,0) > 0 THEN 100.0
      ELSE 0
    END,
    ROUND(COALESCE(n.cnt,0) * 0.25, 2),
    CASE
      WHEN COALESCE(p.cnt,0) > 0 AND ((COALESCE(n.cnt,0)::numeric - p.cnt)/p.cnt) >= 0.60 THEN 'high_potential'
      WHEN COALESCE(p.cnt,0) > 0 AND ((COALESCE(n.cnt,0)::numeric - p.cnt)/p.cnt) >= 0.30 THEN 'invest'
      WHEN COALESCE(p.cnt,0) > 0 AND ((COALESCE(n.cnt,0)::numeric - p.cnt)/p.cnt) <= -0.25 THEN 'review'
      ELSE 'maintain'
    END
  FROM artists a
  LEFT JOIN downloads_now n ON n.artist_id = a.id
  LEFT JOIN downloads_prev p ON p.artist_id = a.id
  LEFT JOIN song_counts sc ON sc.artist_id = a.id
  WHERE COALESCE(n.cnt,0) > 0
  ORDER BY COALESCE(n.cnt,0) DESC
  LIMIT p_limit;
END;
$$;

-- 6. AI Alerts
CREATE OR REPLACE FUNCTION public.get_ceo_ai_alerts(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_start timestamptz := v_now - (p_days || ' days')::interval;
  v_alerts jsonb := '[]'::jsonb;
  r record;
  v_fraud_count integer;
  v_subs_now integer;
  v_subs_prev integer;
  v_ip_overuse integer;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Viral songs (growth > 60%)
  FOR r IN
    SELECT * FROM get_ceo_top_songs(p_days, 5) WHERE ai_status = 'viral'
  LOOP
    v_alerts := v_alerts || jsonb_build_object(
      'id', 'viral-' || r.song_id,
      'type', 'trending_song',
      'severity', 'medium',
      'title', 'Canción en tendencia',
      'description', r.title || ' de ' || r.artist_name || ' creció ' || r.growth_pct || '% vs periodo anterior.',
      'recommendation', 'Promociona en el carrusel principal y comparte en redes.',
      'created_at', v_now
    );
  END LOOP;

  -- Fraud
  SELECT COUNT(*) INTO v_fraud_count FROM user_fraud_score WHERE is_suspicious = true AND last_event_at >= v_start;
  IF v_fraud_count > 0 THEN
    v_alerts := v_alerts || jsonb_build_object(
      'id', 'fraud-summary',
      'type', 'fraud_increase',
      'severity', CASE WHEN v_fraud_count > 10 THEN 'critical' WHEN v_fraud_count > 3 THEN 'high' ELSE 'medium' END,
      'title', 'Aumento de fraude detectado',
      'description', v_fraud_count || ' usuarios marcados como sospechosos en el periodo.',
      'recommendation', 'Revisa la sección de descargas y bloquea cuentas confirmadas.',
      'created_at', v_now
    );
  END IF;

  -- Subscriptions dropping
  SELECT COUNT(*) INTO v_subs_now FROM user_subscriptions WHERE status='active' AND created_at >= v_start;
  SELECT COUNT(*) INTO v_subs_prev FROM user_subscriptions WHERE status='active' AND created_at >= (v_start - (p_days || ' days')::interval) AND created_at < v_start;
  IF v_subs_prev > 0 AND v_subs_now < v_subs_prev * 0.75 THEN
    v_alerts := v_alerts || jsonb_build_object(
      'id', 'subs-drop',
      'type', 'subscriptions_dropping',
      'severity', 'high',
      'title', 'Suscripciones bajando',
      'description', 'Nuevas suscripciones cayeron de ' || v_subs_prev || ' a ' || v_subs_now || '.',
      'recommendation', 'Activa una campaña de re-engagement o descuento limitado.',
      'created_at', v_now
    );
  END IF;

  -- Multiple QR activations from same IP (uses user_downloads grouped by ip)
  SELECT COUNT(*) INTO v_ip_overuse FROM (
    SELECT ip_address FROM user_downloads
    WHERE downloaded_at >= v_start AND ip_address IS NOT NULL
    GROUP BY ip_address HAVING COUNT(DISTINCT user_id) > 5
  ) sub;
  IF v_ip_overuse > 0 THEN
    v_alerts := v_alerts || jsonb_build_object(
      'id', 'ip-overuse',
      'type', 'ip_abuse',
      'severity', 'high',
      'title', 'Uso anómalo desde misma IP',
      'description', v_ip_overuse || ' IPs con más de 5 cuentas distintas descargando.',
      'recommendation', 'Audita las descargas filtradas por IP.',
      'created_at', v_now
    );
  END IF;

  RETURN v_alerts;
END;
$$;

-- 7. Fraud summary
CREATE OR REPLACE FUNCTION public.get_ceo_fraud_summary(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz := now() - (p_days || ' days')::interval;
  v_suspicious_downloads integer;
  v_repeated_ips integer;
  v_flagged_users integer;
  v_avg_score numeric;
  v_critical_alerts integer;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COUNT(*) INTO v_suspicious_downloads
    FROM user_downloads WHERE downloaded_at >= v_start AND fraud_score > 50;

  SELECT COUNT(*) INTO v_repeated_ips FROM (
    SELECT ip_address FROM user_downloads
    WHERE downloaded_at >= v_start AND ip_address IS NOT NULL
    GROUP BY ip_address HAVING COUNT(*) > 10
  ) sub;

  SELECT COUNT(*) INTO v_flagged_users FROM user_fraud_score WHERE is_suspicious = true;
  SELECT COALESCE(AVG(score),0) INTO v_avg_score FROM user_fraud_score;
  SELECT COUNT(*) INTO v_critical_alerts FROM user_fraud_score WHERE score > 80;

  RETURN jsonb_build_object(
    'suspicious_downloads', v_suspicious_downloads,
    'repeated_ips', v_repeated_ips,
    'flagged_users', v_flagged_users,
    'avg_fraud_score', ROUND(v_avg_score, 1),
    'critical_alerts', v_critical_alerts
  );
END;
$$;

-- 8. Sales forecast
CREATE OR REPLACE FUNCTION public.get_ceo_sales_forecast(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_start timestamptz := v_now - (p_days || ' days')::interval;
  v_prev_start timestamptz := v_now - (p_days*2 || ' days')::interval;
  v_rev_now numeric;
  v_rev_prev numeric;
  v_daily_avg numeric;
  v_growth numeric := 0;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COALESCE(SUM(amount_cents),0)/100.0 INTO v_rev_now
    FROM card_purchases WHERE status='paid' AND created_at >= v_start;
  SELECT COALESCE(SUM(amount_cents),0)/100.0 INTO v_rev_prev
    FROM card_purchases WHERE status='paid' AND created_at >= v_prev_start AND created_at < v_start;

  v_daily_avg := v_rev_now / GREATEST(p_days, 1);
  IF v_rev_prev > 0 THEN
    v_growth := (v_rev_now - v_rev_prev) / v_rev_prev;
  END IF;

  RETURN jsonb_build_object(
    'daily_avg', ROUND(v_daily_avg, 2),
    'growth_factor', ROUND(v_growth, 3),
    'forecast_7', jsonb_build_object(
      'conservative', ROUND(v_daily_avg * 7 * 0.85, 2),
      'realistic', ROUND(v_daily_avg * 7 * (1 + v_growth * 0.5), 2),
      'optimistic', ROUND(v_daily_avg * 7 * (1 + GREATEST(v_growth, 0.1)), 2)
    ),
    'forecast_30', jsonb_build_object(
      'conservative', ROUND(v_daily_avg * 30 * 0.80, 2),
      'realistic', ROUND(v_daily_avg * 30 * (1 + v_growth * 0.5), 2),
      'optimistic', ROUND(v_daily_avg * 30 * (1 + GREATEST(v_growth, 0.15)), 2)
    ),
    'forecast_90', jsonb_build_object(
      'conservative', ROUND(v_daily_avg * 90 * 0.75, 2),
      'realistic', ROUND(v_daily_avg * 90 * (1 + v_growth * 0.4), 2),
      'optimistic', ROUND(v_daily_avg * 90 * (1 + GREATEST(v_growth, 0.20)), 2)
    )
  );
END;
$$;

-- 9. Recommendations
CREATE OR REPLACE FUNCTION public.get_ceo_recommendations(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recs jsonb := '[]'::jsonb;
  v_kpis jsonb;
  v_fraud jsonb;
  r record;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_kpis := get_ceo_kpis(p_days);
  v_fraud := get_ceo_fraud_summary(p_days);

  -- Promote viral songs
  FOR r IN SELECT * FROM get_ceo_top_songs(p_days, 3) WHERE ai_status IN ('viral','promote') LOOP
    v_recs := v_recs || jsonb_build_object(
      'id', 'rec-promo-' || r.song_id,
      'title', 'Promocionar la canción "' || r.title || '" durante 72h',
      'description', r.artist_name || ' está creciendo ' || r.growth_pct || '%. Aprovecha el momentum.',
      'impact', 'high', 'difficulty', 'low', 'priority', 1,
      'action', 'promote_song'
    );
  END LOOP;

  -- High potential artists
  FOR r IN SELECT * FROM get_ceo_top_artists(p_days, 3) WHERE recommendation = 'high_potential' LOOP
    v_recs := v_recs || jsonb_build_object(
      'id', 'rec-artist-' || r.artist_id,
      'title', 'Contactar a ' || r.name || ' por alto crecimiento',
      'description', 'Crecimiento de ' || r.growth_pct || '% en descargas. Considera un acuerdo de promoción.',
      'impact', 'high', 'difficulty', 'medium', 'priority', 2,
      'action', 'contact_artist'
    );
  END LOOP;

  -- Fraud
  IF (v_fraud->>'critical_alerts')::int > 0 THEN
    v_recs := v_recs || jsonb_build_object(
      'id', 'rec-fraud',
      'title', 'Revisar actividad sospechosa en tarjetas QR',
      'description', v_fraud->>'critical_alerts' || ' usuarios con score crítico. Audita y bloquea si procede.',
      'impact', 'high', 'difficulty', 'medium', 'priority', 1,
      'action', 'review_fraud'
    );
  END IF;

  -- Subscriptions
  IF (v_kpis->>'revenue_subscriptions')::numeric < (v_kpis->>'revenue_cards')::numeric * 0.3 THEN
    v_recs := v_recs || jsonb_build_object(
      'id', 'rec-subs',
      'title', 'Reforzar campaña de suscripciones',
      'description', 'Las suscripciones generan poco frente a las tarjetas. Visibiliza el plan recomendado.',
      'impact', 'medium', 'difficulty', 'low', 'priority', 3,
      'action', 'promote_subscriptions'
    );
  END IF;

  -- Premium underperforming
  IF (v_kpis->>'avg_ticket')::numeric < 5 AND (v_kpis->>'card_count')::int > 5 THEN
    v_recs := v_recs || jsonb_build_object(
      'id', 'rec-premium',
      'title', 'Reforzar campaña de tarjetas premium',
      'description', 'Ticket medio bajo. Promociona las tarjetas premium para aumentar el valor por cliente.',
      'impact', 'medium', 'difficulty', 'low', 'priority', 3,
      'action', 'promote_premium'
    );
  END IF;

  -- Re-engagement if active users dropping
  IF (v_kpis->>'active_users_prev')::int > 0
     AND (v_kpis->>'active_users')::int < (v_kpis->>'active_users_prev')::int * 0.8 THEN
    v_recs := v_recs || jsonb_build_object(
      'id', 'rec-reengage',
      'title', 'Activar campaña de re-engagement',
      'description', 'Caída de usuarios activos. Envía notificación con novedades del catálogo.',
      'impact', 'medium', 'difficulty', 'medium', 'priority', 2,
      'action', 'reengagement'
    );
  END IF;

  RETURN v_recs;
END;
$$;

-- Grants (RLS handled by SECURITY DEFINER + is_admin check)
GRANT EXECUTE ON FUNCTION public.get_ceo_health_score(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ceo_kpis(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ceo_revenue_breakdown(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ceo_top_songs(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ceo_top_artists(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ceo_ai_alerts(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ceo_fraud_summary(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ceo_sales_forecast(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ceo_recommendations(integer) TO authenticated;