CREATE OR REPLACE FUNCTION public.auto_create_artist_earning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_main_artist_id uuid;
  v_settings public.admin_financial_settings%ROWTYPE;
  v_card public.qr_cards%ROWTYPE;
  v_xaf_rate numeric := 655.957;
  v_gross integer;
  v_total_artist integer;
  v_collab record;
  v_collab_count integer := 0;
  v_artist_share_xaf integer;
  v_resolved_artist_id uuid;
  v_first boolean := true;
  v_platform_amount integer;
  v_release_date timestamptz;
  v_physical_xaf integer;
  v_eur_per_download numeric;
  v_original_credits integer;
BEGIN
  IF NEW.download_type IS DISTINCT FROM 'real' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_settings FROM public.admin_financial_settings WHERE id = 1;
  IF v_settings IS NULL THEN RETURN NEW; END IF;

  SELECT artist_id INTO v_main_artist_id FROM public.songs WHERE id = NEW.song_id;
  IF v_main_artist_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.qr_card_id IS NOT NULL THEN
    SELECT * INTO v_card FROM public.qr_cards WHERE id = NEW.qr_card_id;
    IF FOUND THEN
      -- Always use ORIGINAL credits per card type (not the remaining download_credits)
      v_original_credits := CASE v_card.card_type WHEN 'premium' THEN 10 ELSE 4 END;
      IF v_card.origin = 'physical' THEN
        v_physical_xaf := CASE v_card.card_type WHEN 'premium' THEN 7000 ELSE 3500 END;
        v_gross := ROUND(v_physical_xaf::numeric / v_original_credits);
      ELSIF v_card.price_cents IS NOT NULL THEN
        v_eur_per_download := (v_card.price_cents::numeric / 100.0) / v_original_credits;
        IF upper(coalesce(v_card.currency,'EUR')) = 'XAF' THEN
          v_gross := ROUND(v_eur_per_download);
        ELSE
          v_gross := ROUND(v_eur_per_download * v_xaf_rate);
        END IF;
      END IF;
    END IF;
  END IF;
  IF v_gross IS NULL OR v_gross <= 0 THEN
    v_gross := v_settings.value_per_download_xaf;
  END IF;

  v_total_artist := ROUND(v_gross * v_settings.artist_percentage / 100.0);
  v_release_date := NEW.downloaded_at + (v_settings.validation_period_days || ' days')::interval;

  SELECT count(*) INTO v_collab_count
  FROM public.song_collaborators WHERE song_id = NEW.song_id;

  IF v_collab_count = 0 THEN
    INSERT INTO public.artist_earnings (
      artist_id, song_id, source_download_id, user_id, qr_card_id,
      gross_amount_xaf, artist_percentage, artist_amount_xaf, platform_amount_xaf,
      status, validation_release_date
    ) VALUES (
      v_main_artist_id, NEW.song_id, NEW.id, NEW.user_id, NEW.qr_card_id,
      v_gross, v_settings.artist_percentage, v_total_artist, v_gross - v_total_artist,
      'pending_validation', v_release_date
    )
    ON CONFLICT (source_download_id, artist_id) DO NOTHING;
    RETURN NEW;
  END IF;

  FOR v_collab IN
    SELECT sc.artist_name, sc.share_percent, sc.is_primary,
           (SELECT a.id FROM public.artists a WHERE lower(a.name) = lower(sc.artist_name) LIMIT 1) AS resolved_id
    FROM public.song_collaborators sc
    WHERE sc.song_id = NEW.song_id
    ORDER BY sc.is_primary DESC, sc.share_percent DESC
  LOOP
    v_artist_share_xaf := ROUND(v_total_artist * v_collab.share_percent / 100.0);
    v_resolved_artist_id := COALESCE(v_collab.resolved_id, CASE WHEN v_collab.is_primary THEN v_main_artist_id ELSE NULL END);
    IF v_resolved_artist_id IS NULL THEN CONTINUE; END IF;

    IF v_first THEN
      v_platform_amount := v_gross - v_total_artist;
      v_first := false;
    ELSE
      v_platform_amount := 0;
    END IF;

    INSERT INTO public.artist_earnings (
      artist_id, song_id, source_download_id, user_id, qr_card_id,
      gross_amount_xaf, artist_percentage, artist_amount_xaf, platform_amount_xaf,
      status, validation_release_date, notes
    ) VALUES (
      v_resolved_artist_id, NEW.song_id, NEW.id, NEW.user_id, NEW.qr_card_id,
      v_gross, v_settings.artist_percentage * v_collab.share_percent / 100.0,
      v_artist_share_xaf, v_platform_amount,
      'pending_validation', v_release_date,
      'collab_share=' || v_collab.share_percent::text || '%'
    )
    ON CONFLICT (source_download_id, artist_id) DO NOTHING;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM public.artist_earnings WHERE source_download_id = NEW.id) THEN
    INSERT INTO public.artist_earnings (
      artist_id, song_id, source_download_id, user_id, qr_card_id,
      gross_amount_xaf, artist_percentage, artist_amount_xaf, platform_amount_xaf,
      status, validation_release_date
    ) VALUES (
      v_main_artist_id, NEW.song_id, NEW.id, NEW.user_id, NEW.qr_card_id,
      v_gross, v_settings.artist_percentage, v_total_artist, v_gross - v_total_artist,
      'pending_validation', v_release_date
    )
    ON CONFLICT (source_download_id, artist_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recalc earnings from existing real downloads
DELETE FROM public.artist_earnings
WHERE source_download_id IN (SELECT id FROM public.user_downloads WHERE download_type = 'real');

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.user_downloads WHERE download_type = 'real' LOOP
    UPDATE public.user_downloads SET downloaded_at = downloaded_at WHERE id = r.id;
  END LOOP;
END $$;