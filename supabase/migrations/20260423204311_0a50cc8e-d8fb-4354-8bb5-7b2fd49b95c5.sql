ALTER TABLE public.artist_requests REPLICA IDENTITY FULL;
ALTER TABLE public.song_submissions REPLICA IDENTITY FULL;
ALTER TABLE public.collaboration_claims REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.artist_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.song_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_claims;