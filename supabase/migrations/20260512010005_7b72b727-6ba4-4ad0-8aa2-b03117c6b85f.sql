CREATE OR REPLACE FUNCTION public.get_pending_collaborations_for_artist()
 RETURNS TABLE(collaborator_id uuid, song_id uuid, song_title text, song_cover_url text, artist_name text, share_percent numeric, estimated_revenue_cents integer, downloads integer, has_pending_claim boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  XAF_PER_EUR CONSTANT numeric := 655.957;
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
  )
  SELECT
    sc.id,
    s.id,
    s.title,
    s.cover_url,
    sc.artist_name,
    sc.share_percent,
    COALESCE(SUM(
      COALESCE(co.per_download_eur_cents, 0)
      * (sc.share_percent / 100.0)
      * 0.3
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
  LEFT JOIN public.user_downloads d ON d.song_id = s.id AND d.download_type = 'real'
  LEFT JOIN card_original co ON co.qr_card_id = d.qr_card_id
  WHERE sc.song_id IS NOT NULL
    AND sc.claimed_by_user_id IS NULL
    AND lower(sc.artist_name) IN (SELECT lname FROM my_names)
  GROUP BY sc.id, s.id, s.title, s.cover_url, sc.artist_name, sc.share_percent;
END;
$function$;