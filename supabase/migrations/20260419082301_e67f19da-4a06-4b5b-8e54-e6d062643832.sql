
-- Borrar datos relacionados de usuarios no-admin
DELETE FROM public.user_favorites WHERE user_id IN (
  SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

DELETE FROM public.user_downloads WHERE user_id IN (
  SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

DELETE FROM public.user_balance WHERE user_id IN (
  SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

DELETE FROM public.user_sessions WHERE user_email IN (
  SELECT email FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

DELETE FROM public.user_credits WHERE user_email IN (
  SELECT email FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

DELETE FROM public.profiles WHERE user_id IN (
  SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

DELETE FROM public.user_roles WHERE user_id IN (
  SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

DELETE FROM public.users WHERE id IN (
  SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

-- Resetear activaciones de tarjetas QR hechas por usuarios borrados
UPDATE public.qr_cards 
SET is_activated = false, activated_by = NULL, activated_at = NULL
WHERE activated_by IN (
  SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

-- Finalmente, borrar los usuarios de auth
DELETE FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin');
