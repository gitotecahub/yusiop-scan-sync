CREATE OR REPLACE FUNCTION public.get_ceo_ai_alerts(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_start timestamptz := v_now - (p_days || ' days')::interval;
  v_alerts jsonb := '[]'::jsonb;
  r record;
  v_fraud_count integer;
  v_subs_now integer;
  v_subs_prev integer;
  v_ip_overuse integer;
  v_suspicious_users jsonb;
  v_repeated_ips jsonb;
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
      'created_at', v_now,
      'data', '{}'::jsonb
    );
  END LOOP;

  -- Fraud (with suspicious users list)
  SELECT COUNT(*) INTO v_fraud_count
  FROM user_fraud_score
  WHERE is_suspicious = true AND last_event_at >= v_start;

  IF v_fraud_count > 0 THEN
    SELECT COALESCE(jsonb_agg(item ORDER BY (item->>'score')::int DESC), '[]'::jsonb)
    INTO v_suspicious_users
    FROM (
      SELECT jsonb_build_object(
        'user_id', ufs.user_id,
        'email', COALESCE(u.email, p.username, 'desconocido'),
        'full_name', COALESCE(p.full_name, u.full_name),
        'score', ufs.score,
        'last_event_at', ufs.last_event_at,
        'notes', ufs.notes
      ) AS item
      FROM user_fraud_score ufs
      LEFT JOIN users u ON u.id = ufs.user_id
      LEFT JOIN profiles p ON p.user_id = ufs.user_id
      WHERE ufs.is_suspicious = true AND ufs.last_event_at >= v_start
      ORDER BY ufs.score DESC
      LIMIT 25
    ) sub;

    v_alerts := v_alerts || jsonb_build_object(
      'id', 'fraud-summary',
      'type', 'fraud_increase',
      'severity', CASE WHEN v_fraud_count > 10 THEN 'critical' WHEN v_fraud_count > 3 THEN 'high' ELSE 'medium' END,
      'title', 'Aumento de fraude detectado',
      'description', v_fraud_count || ' usuarios marcados como sospechosos en el periodo.',
      'recommendation', 'Revisa la sección de descargas y bloquea cuentas confirmadas.',
      'created_at', v_now,
      'data', jsonb_build_object('users', v_suspicious_users, 'total', v_fraud_count)
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
      'created_at', v_now,
      'data', '{}'::jsonb
    );
  END IF;

  -- Multiple downloads from same IP (with IP list)
  SELECT COUNT(*) INTO v_ip_overuse FROM (
    SELECT ip_address FROM user_downloads
    WHERE downloaded_at >= v_start AND ip_address IS NOT NULL
    GROUP BY ip_address HAVING COUNT(DISTINCT user_id) > 5
  ) sub;

  IF v_ip_overuse > 0 THEN
    SELECT COALESCE(jsonb_agg(item ORDER BY (item->>'unique_users')::int DESC), '[]'::jsonb)
    INTO v_repeated_ips
    FROM (
      SELECT jsonb_build_object(
        'ip_address', ip_address,
        'unique_users', COUNT(DISTINCT user_id),
        'total_downloads', COUNT(*),
        'country_name', MAX(country_name),
        'city', MAX(city),
        'last_seen', MAX(downloaded_at)
      ) AS item
      FROM user_downloads
      WHERE downloaded_at >= v_start AND ip_address IS NOT NULL
      GROUP BY ip_address
      HAVING COUNT(DISTINCT user_id) > 5
      ORDER BY COUNT(DISTINCT user_id) DESC
      LIMIT 25
    ) sub;

    v_alerts := v_alerts || jsonb_build_object(
      'id', 'ip-overuse',
      'type', 'ip_abuse',
      'severity', 'high',
      'title', 'Uso anómalo desde misma IP',
      'description', v_ip_overuse || ' IPs con más de 5 cuentas distintas descargando.',
      'recommendation', 'Audita las descargas filtradas por IP.',
      'created_at', v_now,
      'data', jsonb_build_object('ips', v_repeated_ips, 'total', v_ip_overuse)
    );
  END IF;

  RETURN v_alerts;
END;
$function$;