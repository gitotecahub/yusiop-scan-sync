CREATE OR REPLACE FUNCTION public.user_owns_artist(_user_id uuid, _artist_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.artists a
    WHERE a.id = _artist_id AND a.owner_user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.artist_profiles ap
    WHERE ap.artist_id = _artist_id
      AND ap.user_id = _user_id
      AND ap.verified_by IS NOT NULL
  );
$function$;