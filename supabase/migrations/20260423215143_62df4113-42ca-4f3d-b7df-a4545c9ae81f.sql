-- Update get_artist_stats: use original card credits (downloads + credits left) and apply 40% artist share
CREATE OR REPLACE FUNCTION public.get_artist_stats(p_artist_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
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
  -- Original credits per card = downloads already taken from it + credits still left
  card_original AS (
    SELECT
      qc.id AS qr_card_id,
      qc.price_cents,
      (
        COALESCE(qc.download_credits, 0)
        + COALESCE((SELECT COUNT(*) FROM public.user_downloads d WHERE d.qr_card_id = qc.id), 0)
      ) AS original_credits
    FROM public.qr_cards qc
  ),
  artist_revenue AS (
    SELECT
      d.song_id,
      ass.song_title,
      d.downloaded_at,
      d.country_code,
      d.country_name,
      d.user_id,
      ass.share_percent,
      -- Per-download price (cents) = card price / original credits, then × split share × 40% artist cut
      (
        COALESCE(co.price_cents::numeric / NULLIF(co.original_credits, 0), 0)
        * (ass.share_percent / 100.0)
        * 0.4
      ) AS revenue_cents
    FROM public.user_downloads d
    JOIN artist_song_share_resolved ass ON ass.song_id = d.song_id AND ass.share_percent > 0
    LEFT JOIN card_original co ON co.qr_card_id = d.qr_card_id
  ),
  totals AS (
    SELECT
      COUNT(*)::int AS total_downloads,
      COUNT(DISTINCT user_id)::int AS unique_listeners,
      COALESCE(SUM(revenue_cents),0)::int AS total_revenue_cents
    FROM artist_revenue
  ),
  by_song AS (
    SELECT
      song_id,
      song_title,
      COUNT(*)::int AS downloads,
      COALESCE(SUM(revenue_cents),0)::int AS revenue_cents
    FROM artist_revenue
    GROUP BY song_id, song_title
    ORDER BY downloads DESC
    LIMIT 20
  ),
  by_country AS (
    SELECT
      COALESCE(country_code,'??') AS country_code,
      COALESCE(country_name,'Desconocido') AS country_name,
      COUNT(*)::int AS downloads
    FROM artist_revenue
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
    FROM artist_revenue ar
    LEFT JOIN public.profiles p ON p.user_id = ar.user_id
    GROUP BY 1 ORDER BY downloads DESC
  ),
  by_gender AS (
    SELECT COALESCE(p.gender,'unknown') AS gender, COUNT(*)::int AS downloads
    FROM artist_revenue ar
    LEFT JOIN public.profiles p ON p.user_id = ar.user_id
    GROUP BY 1 ORDER BY downloads DESC
  ),
  by_day AS (
    SELECT
      to_char(date_trunc('day', downloaded_at), 'YYYY-MM-DD') AS day,
      COUNT(*)::int AS downloads,
      COALESCE(SUM(revenue_cents),0)::int AS revenue_cents
    FROM artist_revenue
    WHERE downloaded_at >= now() - interval '30 days'
    GROUP BY 1 ORDER BY 1
  ),
  pool_pending AS (
    SELECT
      COALESCE(SUM(
        COALESCE(co.price_cents::numeric / NULLIF(co.original_credits, 0), 0)
        * (sc.share_percent / 100.0)
        * 0.4
      ),0)::int AS pending_revenue_cents,
      COUNT(*)::int AS pending_downloads
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

-- Update get_pending_collaborations_for_artist with same formula
CREATE OR REPLACE FUNCTION public.get_pending_collaborations_for_artist()
 RETURNS TABLE(collaborator_id uuid, song_id uuid, song_title text, song_cover_url text, artist_name text, share_percent numeric, estimated_revenue_cents integer, downloads integer, has_pending_claim boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  RETURN QUERY
  WITH my_names AS (
    SELECT lower(ar.artist_name) AS lname
    FROM public.artist_requests ar
    WHERE ar.user_id = v_uid AND ar.status = 'approved'
  ),
  card_original AS (
    SELECT
      qc.id AS qr_card_id,
      qc.price_cents,
      (
        COALESCE(qc.download_credits, 0)
        + COALESCE((SELECT COUNT(*) FROM public.user_downloads d WHERE d.qr_card_id = qc.id), 0)
      ) AS original_credits
    FROM public.qr_cards qc
  )
  SELECT
    sc.id,
    s.id,
    s.title,
    s.cover_url,
    sc.artist_name,
    sc.share_percent,
    COALESCE(SUM(
      COALESCE(co.price_cents::numeric / NULLIF(co.original_credits, 0), 0)
      * (sc.share_percent / 100.0)
      * 0.4
    ),0)::int,
    COUNT(d.id)::int,
    EXISTS(
      SELECT 1 FROM public.collaboration_claims cc
      WHERE cc.collaborator_id = sc.id
        AND cc.claimant_user_id = v_uid
        AND cc.status = 'pending'
    )
  FROM public.song_collaborators sc
  JOIN public.songs s ON s.id = sc.song_id
  LEFT JOIN public.user_downloads d ON d.song_id = s.id
  LEFT JOIN card_original co ON co.qr_card_id = d.qr_card_id
  WHERE sc.song_id IS NOT NULL
    AND sc.claimed_by_user_id IS NULL
    AND lower(sc.artist_name) IN (SELECT lname FROM my_names)
  GROUP BY sc.id, s.id, s.title, s.cover_url, sc.artist_name, sc.share_percent;
END;
$function$;