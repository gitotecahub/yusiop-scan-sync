DROP TRIGGER IF EXISTS trg_auto_assign_pool_on_artist_approve ON public.artist_requests;
DROP FUNCTION IF EXISTS public.auto_assign_collaborator_pool();