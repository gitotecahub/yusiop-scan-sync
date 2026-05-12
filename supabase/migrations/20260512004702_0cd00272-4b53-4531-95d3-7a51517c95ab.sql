CREATE OR REPLACE FUNCTION public.get_artist_stats(p_artist_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
  XAF_PER_EUR CONSTANT numeric := 655.957;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT (public.is_admin(v_uid) OR public.user_owns_artist(v_uid, p_artist_id)) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  WITH
  artist_song_share AS (
    SELECT
      s.id AS song_id,
      s.title AS song_title,
      s.cover_url AS song_cover,
      COALESCE(SUM(
        CASE
          WHEN sc.claimed_by_user_id IS NOT NULL
               AND public.user_owns_artist(sc.claimed_by_user_id, p_artist_id)
          THEN sc.share_percent
          ELSE 0
        END
      ), 0) AS share_percent
    FROM public.songs s
    LEFT JOIN public.song_collaborators sc ON sc.song_id = s.id
    WHERE s.artist_id = p_artist_id
       OR EXISTS (
            SELECT 1 FROM public.song_collaborators sc2
            WHERE sc2.song_id = s.id
              AND sc2.claimed_by_user_id IS NOT NULL
              AND public.user_owns_artist(sc2.claimed_by_user_id, p_artist_id)
          )
    GROUP BY s.id, s.title, s.cover_url
  ),
  artist_song_share_resolved AS (
    SELECT
      ass.song_id,
      ass.song_title,
      ass.song_cover,
      CASE
        WHEN ass.share_percent = 0 AND EXISTS (
          SELECT 1 FROM public.songs s
          WHERE s.id = ass.song_id AND s.artist_id = p_artist_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.song_collaborators sc
          WHERE sc.song_id = ass.song_id
        )
        THEN 100
        ELSE ass.share_percent
      END AS share_percent
    FROM artist_song_share ass
  ),
  card_original AS (
    SELECT
      qc.id AS qr_card_id,
      qc.origin,
      qc.card_type,
      CASE WHEN qc.card_type = 'premium' THEN 10 ELSE 4 END AS original_credits,
      -- Per-download gross expressed in EUR cents
      CASE
        WHEN qc.origin = 'physical' THEN
          (CASE WHEN qc.card_type = 'premium' THEN 7000.0 ELSE 3500.0 END
            / (CASE WHEN qc.card_type = 'premium' THEN 10 ELSE 4 END))
            / XAF_PER_EUR * 100.0
        ELSE
          (CASE WHEN qc.card_type = 'premium' THEN 1000.0 ELSE 500.0 END)
            / (CASE WHEN qc.card_type = 'premium' THEN 10 ELSE 4 END)
      END AS per_download_eur_cents
    FROM public.qr_cards qc
  ),
  artist_downloads AS (
    SELECT
      d.song_id,
      ass.song_title,
      d.downloaded_at,
      d.country_code,
      d.country_name,
      d.user_id,
      d.download_type,
      ass.share_percent,
      CASE WHEN d.download_type = 'real' THEN
        (
          COALESCE(co.per_download_eur_cents, 0)
          * (ass.share_percent / 100.0)
          * 0.3
        )
      ELSE 0 END AS revenue_cents
    FROM public.user_downloads d
    JOIN artist_song_share_resolved ass ON ass.song_id = d.song_id AND ass.share_percent > 0
    LEFT JOIN card_original co ON co.qr_card_id = d.qr_card_id
  ),
  totals AS (
    SELECT
      COUNT(*)::int AS total_downloads,
      COUNT(*) FILTER (WHERE download_type = 'real')::int AS real_downloads,
      COUNT(*) FILTER (WHERE download_type = 'promotional')::int AS promotional_downloads,
      COUNT(*) FILTER (WHERE download_type = 'suspicious')::int AS suspicious_downloads,
      COUNT(DISTINCT user_id) FILTER (WHERE download_type = 'real')::int AS unique_listeners,
      COALESCE(SUM(revenue_cents),0)::int AS total_revenue_cents
    FROM artist_downloads
  ),
  by_song AS (
    SELECT
      song_id,
      song_title,
      COUNT(*)::int AS downloads,
      COUNT(*) FILTER (WHERE download_type = 'real')::int AS real_downloads,
      COALESCE(SUM(revenue_cents),0)::int AS revenue_cents
    FROM artist_downloads
    GROUP BY song_id, song_title
    ORDER BY downloads DESC
    LIMIT 20
  ),
  by_country AS (
    SELECT
      COALESCE(country_code,'??') AS country_code,
      COALESCE(country_name,'Desconocido') AS country_name,
      COUNT(*)::int AS downloads
    FROM artist_downloads
    WHERE download_type = 'real'
    GROUP BY 1,2 ORDER BY downloads DESC LIMIT 50
  ),
  by_age AS (
    SELECT
      CASE
        WHEN p.birth_year IS NULL THEN 'Desconocido'
        WHEN (extract(year from now())::int - p.birth_year) < 18 THEN '<18'
        WHEN (extract(year from now())::int - p.birth_year) BETWEEN 18 AND 24 THEN '18-24'
        WHEN (extract(year from now())::int - p.birth_year) BETWEEN 25 AND 34 THEN '25-34'
        WHEN (extract(year from now())::int - p.birth_year) BETWEEN 35 AND 44 THEN '35-44'
        WHEN (extract(year from now())::int - p.birth_year) BETWEEN 45 AND 54 THEN '45-54'
        ELSE '55+'
      END AS bucket,
      COUNT(*)::int AS downloads
    FROM artist_downloads ar
    LEFT JOIN public.profiles p ON p.user_id = ar.user_id
    WHERE ar.download_type = 'real'
    GROUP BY 1 ORDER BY downloads DESC
  ),
  by_gender AS (
    SELECT COALESCE(p.gender,'unknown') AS gender, COUNT(*)::int AS downloads
    FROM artist_downloads ar
    LEFT JOIN public.profiles p ON p.user_id = ar.user_id
    WHERE ar.download_type = 'real'
    GROUP BY 1 ORDER BY downloads DESC
  ),
  by_day AS (
    SELECT
      to_char(date_trunc('day', downloaded_at), 'YYYY-MM-DD') AS day,
      COUNT(*)::int AS downloads,
      COALESCE(SUM(revenue_cents),0)::int AS revenue_cents
    FROM artist_downloads
    WHERE downloaded_at >= now() - interval '30 days'
    GROUP BY 1 ORDER BY 1
  ),
  pool_pending AS (
    SELECT
      COALESCE(SUM(
        CASE WHEN d.download_type = 'real' THEN
          COALESCE(co.per_download_eur_cents, 0)
          * (sc.share_percent / 100.0)
          * 0.3
        ELSE 0 END
      ),0)::int AS pending_revenue_cents,
      COUNT(*) FILTER (WHERE d.download_type = 'real')::int AS pending_downloads
    FROM public.song_collaborators sc
    JOIN public.user_downloads d ON d.song_id = sc.song_id
    LEFT JOIN card_original co ON co.qr_card_id = d.qr_card_id
    WHERE sc.song_id IS NOT NULL
      AND sc.claimed_by_user_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.artist_requests ar
        JOIN public.artists a ON lower(a.name) = lower(ar.artist_name)
        WHERE ar.user_id = v_uid AND ar.status = 'approved' AND a.id = p_artist_id
          AND lower(ar.artist_name) = lower(sc.artist_name)
      )
  )
  SELECT jsonb_build_object(
    'totals', (SELECT to_jsonb(t) FROM totals t),
    'by_song', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM by_song b), '[]'::jsonb),
    'by_country', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM by_country b), '[]'::jsonb),
    'by_age', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM by_age b), '[]'::jsonb),
    'by_gender', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM by_gender b), '[]'::jsonb),
    'by_day', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM by_day b), '[]'::jsonb),
    'pool_pending', (SELECT to_jsonb(pp) FROM pool_pending pp)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;