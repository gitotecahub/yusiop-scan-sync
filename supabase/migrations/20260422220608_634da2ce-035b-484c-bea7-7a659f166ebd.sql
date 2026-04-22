UPDATE public.qr_cards SET download_credits = 0 WHERE owner_user_id = '2d1db90b-878c-4250-aa88-90123928b23e' OR activated_by = '2d1db90b-878c-4250-aa88-90123928b23e';

UPDATE public.user_credits SET credits_remaining = 0, is_active = false WHERE user_email = (SELECT email FROM auth.users WHERE id = '2d1db90b-878c-4250-aa88-90123928b23e');