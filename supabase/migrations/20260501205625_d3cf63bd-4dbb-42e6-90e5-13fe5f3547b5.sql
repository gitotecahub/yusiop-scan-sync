CREATE OR REPLACE FUNCTION public.approve_song_submission_scheduled(p_submission_id uuid, p_release_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(success boolean, message text, song_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_submission public.song_submissions%ROWTYPE;
  v_artist_id uuid;
  v_album_id uuid;
  v_song_id uuid;
  v_collab_count int;
  v_sum numeric;
  v_effective_release timestamptz;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN QUERY SELECT false, 'No autorizado'::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT * INTO v_submission FROM public.song_submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Envío no encontrado'::text, NULL::uuid;
    RETURN;
  END IF;

  IF v_submission.status <> 'pending' THEN
    RETURN QUERY SELECT false, 'El envío ya fue revisado'::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT COUNT(*), COALESCE(SUM(share_percent),0)
    INTO v_collab_count, v_sum
  FROM public.song_collaborators
  WHERE submission_id = p_submission_id;

  IF v_collab_count > 0 AND v_sum <> 100 THEN
    RETURN QUERY SELECT false, ('La suma de splits debe ser 100% (actual: ' || v_sum || '%)')::text, NULL::uuid;
    RETURN;
  END IF;

  IF p_release_at IS NULL OR p_release_at <= now() THEN
    v_effective_release := NULL;
  ELSE
    v_effective_release := p_release_at;
  END IF;

  SELECT id INTO v_artist_id FROM public.artists WHERE lower(name) = lower(v_submission.artist_name) LIMIT 1;
  IF v_artist_id IS NULL THEN
    INSERT INTO public.artists (name) VALUES (v_submission.artist_name) RETURNING id INTO v_artist_id;
  END IF;

  IF v_submission.album_title IS NOT NULL AND length(trim(v_submission.album_title)) > 0 THEN
    SELECT id INTO v_album_id FROM public.albums
      WHERE artist_id = v_artist_id AND lower(title) = lower(v_submission.album_title)
      LIMIT 1;
    IF v_album_id IS NULL THEN
      INSERT INTO public.albums (artist_id, title, release_date, cover_url)
        VALUES (v_artist_id, v_submission.album_title, v_submission.release_date, v_submission.cover_url)
        RETURNING id INTO v_album_id;
    END IF;
  END IF;

  INSERT INTO public.songs (
    artist_id, album_id, title, duration_seconds,
    cover_url, track_url, preview_url, preview_start_seconds,
    scheduled_release_at, ai_type, review_status, reviewed_by, reviewed_at
  ) VALUES (
    v_artist_id, v_album_id, v_submission.title, v_submission.duration_seconds,
    v_submission.cover_url, v_submission.track_url, v_submission.preview_url, v_submission.preview_start_seconds,
    v_effective_release, COALESCE(v_submission.ai_type, 'none'::ai_usage_type), 'approved'::song_review_status, auth.uid(), now()
  ) RETURNING id INTO v_song_id;

  IF v_collab_count > 0 THEN
    INSERT INTO public.song_collaborators
      (song_id, artist_name, share_percent, is_primary, role, contact_email, claimed_by_user_id, claimed_at)
    SELECT
      v_song_id,
      sc.artist_name,
      sc.share_percent,
      sc.is_primary,
      sc.role,
      CASE WHEN sc.is_primary THEN NULL ELSE NULLIF(lower(trim(sc.contact_email)), '') END,
      CASE WHEN lower(sc.artist_name) = lower(v_submission.artist_name) THEN v_submission.user_id ELSE NULL END,
      CASE WHEN lower(sc.artist_name) = lower(v_submission.artist_name) THEN now() ELSE NULL END
    FROM public.song_collaborators sc
    WHERE sc.submission_id = p_submission_id;
  ELSE
    INSERT INTO public.song_collaborators
      (song_id, artist_name, share_percent, is_primary, role, contact_email, claimed_by_user_id, claimed_at)
    VALUES
      (v_song_id, v_submission.artist_name, 100, true, 'featuring', NULL, v_submission.user_id, now());
  END IF;

  UPDATE public.song_submissions
    SET status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        published_song_id = v_song_id,
        scheduled_release_at = v_effective_release,
        rejection_reason = NULL
    WHERE id = p_submission_id;

  IF v_effective_release IS NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_submission.user_id,
      'song_submission_approved',
      '✅ ¡Tu canción ha sido aprobada!',
      'Tu canción "' || v_submission.title || '" ya está disponible en el catálogo de Yusiop.',
      jsonb_build_object('submission_id', p_submission_id, 'song_id', v_song_id, 'song_title', v_submission.title)
    );
  ELSE
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_submission.user_id,
      'song_submission_approved',
      '✅ ¡Tu canción ha sido programada!',
      'Tu canción "' || v_submission.title || '" se publicará el ' || to_char(v_effective_release at time zone 'Europe/Madrid', 'DD/MM/YYYY HH24:MI'),
      jsonb_build_object('submission_id', p_submission_id, 'song_id', v_song_id, 'song_title', v_submission.title, 'scheduled_release_at', v_effective_release)
    );
  END IF;

  RETURN QUERY SELECT true, 'Canción aprobada y publicada'::text, v_song_id;
END;
$function$;
