-- Limpia el campo express_paid_at en submissions que fueron creadas con un bundle
-- antiguo que marcaba el Express como pagado automáticamente sin pasar por la
-- pasarela. Solo afecta a submissions sin pago Stripe registrado en payments.
-- Conservadoramente solo limpia las dos canciones del usuario afectado por el bug
-- reportado (Funky y María) para no impactar otros pagos legítimos.
update public.song_submissions
set express_paid_at = null
where id in (
  '765053bd-f1b8-40c1-af2c-9857e6b66ca0',
  '34f70c34-5fa8-4806-80ae-0acd074c5d12'
)
and express_tier is not null
and express_price_xaf > 0;