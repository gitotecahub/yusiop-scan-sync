CREATE OR REPLACE FUNCTION public.get_ceo_kpis(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_promo_rev numeric := 0;
  v_promo_rev_prev numeric := 0;

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

  SELECT COALESCE(SUM(amount_cents),0)/100.0, COUNT(*)
    INTO v_card_rev, v_card_count
    FROM card_purchases WHERE status='paid' AND created_at >= v_start;
  SELECT COALESCE(SUM(amount_cents),0)/100.0 INTO v_card_rev_prev
    FROM card_purchases WHERE status='paid' AND created_at >= v_prev_start AND created_at < v_start;

  SELECT COALESCE(SUM(sp.price_eur_cents),0)/100.0 * (p_days::numeric / 30.0) INTO v_sub_rev
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.status='active' AND us.created_at <= v_now AND (us.cancelled_at IS NULL OR us.cancelled_at >= v_start);
  SELECT COALESCE(SUM(sp.price_eur_cents),0)/100.0 * (p_days::numeric / 30.0) INTO v_sub_rev_prev
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.status='active' AND us.created_at < v_start;

  SELECT COALESCE(SUM(express_price_xaf),0)/655.0 INTO v_express_rev
    FROM song_submissions WHERE express_paid_at >= v_start;
  SELECT COALESCE(SUM(express_price_xaf),0)/655.0 INTO v_express_rev_prev
    FROM song_submissions WHERE express_paid_at >= v_prev_start AND express_paid_at < v_start;

  -- Promotion / advertising revenue (paid ad campaigns)
  SELECT COALESCE(SUM(COALESCE(price_eur, 0) + COALESCE(price_xaf, 0)/655.0), 0) INTO v_promo_rev
    FROM ad_campaigns
    WHERE payment_status = 'paid'
      AND campaign_type <> 'yusiop_service'
      AND COALESCE(reviewed_at, created_at) >= v_start;
  SELECT COALESCE(SUM(COALESCE(price_eur, 0) + COALESCE(price_xaf, 0)/655.0), 0) INTO v_promo_rev_prev
    FROM ad_campaigns
    WHERE payment_status = 'paid'
      AND campaign_type <> 'yusiop_service'
      AND COALESCE(reviewed_at, created_at) >= v_prev_start
      AND COALESCE(reviewed_at, created_at) < v_start;

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
    'revenue_total', ROUND((v_card_rev + v_sub_rev + v_express_rev + v_promo_rev)::numeric, 2),
    'revenue_total_prev', ROUND((v_card_rev_prev + v_sub_rev_prev + v_express_rev_prev + v_promo_rev_prev)::numeric, 2),
    'revenue_cards', ROUND(v_card_rev::numeric, 2),
    'revenue_cards_prev', ROUND(v_card_rev_prev::numeric, 2),
    'revenue_subscriptions', ROUND(v_sub_rev::numeric, 2),
    'revenue_subscriptions_prev', ROUND(v_sub_rev_prev::numeric, 2),
    'revenue_express', ROUND(v_express_rev::numeric, 2),
    'revenue_express_prev', ROUND(v_express_rev_prev::numeric, 2),
    'revenue_promotion', ROUND(v_promo_rev::numeric, 2),
    'revenue_promotion_prev', ROUND(v_promo_rev_prev::numeric, 2),
    'downloads', v_downloads,
    'downloads_prev', v_downloads_prev,
    'active_users', v_active_users,
    'active_users_prev', v_active_users_prev,
    'active_artists', v_active_artists,
    'card_count', v_card_count,
    'avg_ticket', ROUND(v_avg_ticket::numeric, 2),
    'conversion_rate', CASE WHEN v_total_users > 0 THEN ROUND((v_paying_users::numeric / v_total_users) * 100, 2) ELSE 0 END,
    'estimated_profit', ROUND(((v_card_rev + v_sub_rev + v_express_rev + v_promo_rev) * 0.55)::numeric, 2)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_ceo_revenue_breakdown(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_kpis jsonb;
  v_total numeric;
  v_cards numeric;
  v_subs numeric;
  v_express numeric;
  v_promo numeric;
  v_cards_prev numeric;
  v_subs_prev numeric;
  v_express_prev numeric;
  v_promo_prev numeric;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_kpis := get_ceo_kpis(p_days);
  v_cards := (v_kpis->>'revenue_cards')::numeric;
  v_subs := (v_kpis->>'revenue_subscriptions')::numeric;
  v_express := (v_kpis->>'revenue_express')::numeric;
  v_promo := COALESCE((v_kpis->>'revenue_promotion')::numeric, 0);
  v_cards_prev := (v_kpis->>'revenue_cards_prev')::numeric;
  v_subs_prev := (v_kpis->>'revenue_subscriptions_prev')::numeric;
  v_express_prev := (v_kpis->>'revenue_express_prev')::numeric;
  v_promo_prev := COALESCE((v_kpis->>'revenue_promotion_prev')::numeric, 0);
  v_total := GREATEST(v_cards + v_subs + v_express + v_promo, 0.01);

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
    ),
    jsonb_build_object(
      'engine', 'promotion', 'label', 'Promoción', 'revenue', v_promo,
      'percent', ROUND((v_promo / v_total)*100, 1),
      'trend', CASE WHEN v_promo_prev > 0 THEN ROUND(((v_promo - v_promo_prev)/v_promo_prev)*100, 1) ELSE NULL END,
      'recommendation', CASE
        WHEN v_promo = 0 THEN 'Aún no hay ingresos por promoción. Impulsa campañas de artistas y marcas.'
        WHEN v_promo_prev > 0 AND ((v_promo - v_promo_prev)/v_promo_prev) > 0.20 THEN 'Promoción al alza. Considera nuevos formatos publicitarios.'
        ELSE 'Buen canal complementario. Optimiza precios y placements.'
      END
    )
  );
END;
$function$;