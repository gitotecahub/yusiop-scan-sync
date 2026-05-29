
-- SONGS: genre
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS genre text;
CREATE INDEX IF NOT EXISTS idx_songs_genre ON public.songs(genre);

-- PLAYLISTS
CREATE TABLE public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  cover_url text,
  is_public boolean NOT NULL DEFAULT false,
  share_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(share_token)
);
CREATE INDEX idx_playlists_user ON public.playlists(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists TO authenticated;
GRANT SELECT ON public.playlists TO anon;
GRANT ALL ON public.playlists TO service_role;

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Playlists owner all" ON public.playlists FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Playlists admin all" ON public.playlists FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Playlists public read" ON public.playlists FOR SELECT TO anon, authenticated
  USING (is_public = true);

CREATE TRIGGER trg_playlists_updated_at BEFORE UPDATE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PLAYLIST_TRACKS
CREATE TABLE public.playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, song_id)
);
CREATE INDEX idx_pt_playlist ON public.playlist_tracks(playlist_id, position);
CREATE INDEX idx_pt_song ON public.playlist_tracks(song_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlist_tracks TO authenticated;
GRANT SELECT ON public.playlist_tracks TO anon;
GRANT ALL ON public.playlist_tracks TO service_role;

ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PT read visible" ON public.playlist_tracks FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_tracks.playlist_id
    AND (p.is_public = true OR p.user_id = auth.uid() OR is_admin(auth.uid()))));
CREATE POLICY "PT owner all" ON public.playlist_tracks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()));
CREATE POLICY "PT admin all" ON public.playlist_tracks FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_playlist_track_ownership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id FROM public.playlists WHERE id = NEW.playlist_id;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'Playlist not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_downloads WHERE user_id = owner_id AND song_id = NEW.song_id) THEN
    RAISE EXCEPTION 'Song must be in playlist owner library';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pt_validate_ownership BEFORE INSERT ON public.playlist_tracks
  FOR EACH ROW EXECUTE FUNCTION public.validate_playlist_track_ownership();

-- USER_LISTENING_HISTORY
CREATE TABLE public.user_listening_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  played_at timestamptz NOT NULL DEFAULT now(),
  duration_ms integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false
);
CREATE INDEX idx_hist_user ON public.user_listening_history(user_id, played_at DESC);
CREATE INDEX idx_hist_song ON public.user_listening_history(song_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_listening_history TO authenticated;
GRANT ALL ON public.user_listening_history TO service_role;

ALTER TABLE public.user_listening_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hist owner all" ON public.user_listening_history FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Hist admin read" ON public.user_listening_history FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- USER_ARTIST_FOLLOWS
CREATE TABLE public.user_artist_follows (
  user_id uuid NOT NULL,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, artist_id)
);
CREATE INDEX idx_follow_artist ON public.user_artist_follows(artist_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_artist_follows TO authenticated;
GRANT ALL ON public.user_artist_follows TO service_role;

ALTER TABLE public.user_artist_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follow owner all" ON public.user_artist_follows FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Follow admin read" ON public.user_artist_follows FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- RECOMMENDATION_EVENTS
CREATE TABLE public.recommendation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  song_id uuid REFERENCES public.songs(id) ON DELETE CASCADE,
  source text NOT NULL,
  score numeric,
  shown_at timestamptz NOT NULL DEFAULT now(),
  clicked_at timestamptz
);
CREATE INDEX idx_rec_user ON public.recommendation_events(user_id, shown_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendation_events TO authenticated;
GRANT ALL ON public.recommendation_events TO service_role;

ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rec owner all" ON public.recommendation_events FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Rec admin read" ON public.recommendation_events FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));
