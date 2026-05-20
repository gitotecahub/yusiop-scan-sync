INSERT INTO public.artist_earnings (
  artist_id, song_id, source_download_id, user_id, qr_card_id,
  gross_amount_xaf, artist_percentage, artist_amount_xaf, platform_amount_xaf,
  status, validation_release_date, created_at
)
SELECT
  s.artist_id,
  d.song_id,
  d.id,
  d.user_id,
  d.qr_card_id,
  fs.value_per_download_xaf,
  fs.artist_percentage,
  ROUND(fs.value_per_download_xaf * fs.artist_percentage / 100.0)::int,
  fs.value_per_download_xaf - ROUND(fs.value_per_download_xaf * fs.artist_percentage / 100.0)::int,
  CASE
    WHEN d.downloaded_at + (fs.validation_period_days || ' days')::interval <= now()
      THEN 'available'::artist_earning_status
    ELSE 'pending_validation'::artist_earning_status
  END,
  d.downloaded_at + (fs.validation_period_days || ' days')::interval,
  d.downloaded_at
FROM public.user_downloads d
JOIN public.songs s ON s.id = d.song_id
CROSS JOIN public.admin_financial_settings fs
WHERE d.download_type = 'real'
  AND s.artist_id IS NOT NULL
  AND fs.id = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.artist_earnings e WHERE e.source_download_id = d.id
  );