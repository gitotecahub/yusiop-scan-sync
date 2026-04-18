-- Renovar la fecha de expiración del crédito activo del usuario diddyesoficial@gmail.com
-- para que pueda volver a descargar (su tarjeta tiene 5 créditos pero la fecha estaba caducada).
UPDATE public.user_credits
SET expires_at = now() + interval '30 days',
    is_active = true
WHERE id = '34c44ccb-d215-4e2d-979e-981199b9dfba';