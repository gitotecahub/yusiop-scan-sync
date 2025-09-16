-- Asignar rol de admin al usuario existente
INSERT INTO public.user_roles (user_id, role) 
VALUES ('17ca015d-6e69-4023-8150-1820080bfa1c', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;