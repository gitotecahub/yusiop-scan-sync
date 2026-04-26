-- Sincronizar ingresos históricos para todos los artistas
-- Genera artist_earnings retroactivamente para descargas que no tienen ingreso asociado

DO $$
DECLARE
  v_settings record;
  v_download record;
  v_validation_release timestamptz;
  v_status artist_earning_status;
  v_artist_amount integer;
  v_platform_amount integer;
  v_count integer := 0;
BEGIN
  SELECT artist_percentage, value_per_download_xaf, validation_period_days
  INTO v_settings
  FROM admin_financial_settings
  WHERE id = 1;

  FOR v_download IN
    SELECT 
      ud.id as download_id,
      ud.song_id,
      ud.user_id,
      ud.qr_card_id,
      ud.downloaded_at,
      s.artist_id
    FROM user_downloads ud
    JOIN songs s ON s.id = ud.song_id
    LEFT JOIN artist_earnings ae ON ae.source_download_id = ud.id
    WHERE ae.id IS NULL
      AND s.artist_id IS NOT NULL
      AND ud.download_type = 'real'
  LOOP
    v_validation_release := v_download.downloaded_at + (v_settings.validation_period_days || ' days')::interval;
    
    IF v_validation_release <= now() THEN
      v_status := 'available';
    ELSE
      v_status := 'pending_validation';
    END IF;

    v_artist_amount := ROUND(v_settings.value_per_download_xaf * v_settings.artist_percentage / 100.0);
    v_platform_amount := v_settings.value_per_download_xaf - v_artist_amount;

    INSERT INTO artist_earnings (
      artist_id, song_id, source_download_id, user_id, qr_card_id,
      gross_amount_xaf, artist_percentage, artist_amount_xaf, platform_amount_xaf,
      status, validation_release_date, created_at, notes
    ) VALUES (
      v_download.artist_id, v_download.song_id, v_download.download_id,
      v_download.user_id, v_download.qr_card_id,
      v_settings.value_per_download_xaf, v_settings.artist_percentage,
      v_artist_amount, v_platform_amount,
      v_status, v_validation_release, v_download.downloaded_at,
      'Sincronización histórica retroactiva'
    );

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Ingresos históricos creados: %', v_count;
END $$;