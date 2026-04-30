
-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.friend_request_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');
CREATE TYPE public.shared_item_type AS ENUM ('song', 'artist', 'digital_card');

-- ============================================
-- TABLES (create all first, policies after)
-- ============================================
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status friend_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT friend_request_no_self CHECK (sender_id <> receiver_id)
);

CREATE UNIQUE INDEX uq_friend_requests_pending
  ON public.friend_requests (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))
  WHERE status = 'pending';

CREATE INDEX idx_friend_requests_receiver ON public.friend_requests(receiver_id, status);
CREATE INDEX idx_friend_requests_sender ON public.friend_requests(sender_id, status);

CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT friends_no_self CHECK (user_id <> friend_id),
  CONSTRAINT friends_unique UNIQUE (user_id, friend_id)
);

CREATE INDEX idx_friends_user ON public.friends(user_id);
CREATE INDEX idx_friends_friend ON public.friends(friend_id);

CREATE TABLE public.shared_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  item_type shared_item_type NOT NULL,
  item_id UUID NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  CONSTRAINT shared_items_no_self CHECK (sender_id <> receiver_id)
);

CREATE INDEX idx_shared_items_receiver ON public.shared_items(receiver_id, created_at DESC);
CREATE INDEX idx_shared_items_sender ON public.shared_items(sender_id, created_at DESC);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;

-- friend_requests
CREATE POLICY "Users view their own friend requests"
ON public.friend_requests FOR SELECT TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users send their own friend requests"
ON public.friend_requests FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND sender_id <> receiver_id
  AND NOT EXISTS (
    SELECT 1 FROM public.friends f
    WHERE f.user_id = auth.uid() AND f.friend_id = receiver_id
  )
);

CREATE POLICY "Receiver can update request status"
ON public.friend_requests FOR UPDATE TO authenticated
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid());

CREATE POLICY "Sender can cancel their request"
ON public.friend_requests FOR DELETE TO authenticated
USING (sender_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins manage all friend requests"
ON public.friend_requests FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- friends
CREATE POLICY "Users view their own friendships"
ON public.friends FOR SELECT TO authenticated
USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can delete their own friendships"
ON public.friends FOR DELETE TO authenticated
USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Admins manage all friendships"
ON public.friends FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- shared_items
CREATE POLICY "Users view their shared items"
ON public.shared_items FOR SELECT TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Friends can share items"
ON public.shared_items FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND sender_id <> receiver_id
  AND EXISTS (
    SELECT 1 FROM public.friends f
    WHERE f.user_id = auth.uid() AND f.friend_id = receiver_id
  )
);

CREATE POLICY "Receiver can mark as viewed"
ON public.shared_items FOR UPDATE TO authenticated
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid());

CREATE POLICY "Sender or receiver can delete shared items"
ON public.shared_items FOR DELETE TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Admins manage shared items"
ON public.shared_items FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- TRIGGERS / FUNCTIONS
-- ============================================
CREATE TRIGGER trg_friend_requests_updated_at
BEFORE UPDATE ON public.friend_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_friend_request_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sender_name TEXT;
BEGIN
  IF NEW.status = 'pending' THEN
    SELECT COALESCE(full_name, username, 'Alguien') INTO sender_name
      FROM public.profiles WHERE user_id = NEW.sender_id LIMIT 1;
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (NEW.receiver_id, 'friend_request_received', 'Nueva solicitud de amistad',
      COALESCE(sender_name, 'Alguien') || ' quiere ser tu amigo',
      jsonb_build_object('request_id', NEW.id, 'sender_id', NEW.sender_id));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_friend_request_created
AFTER INSERT ON public.friend_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_friend_request_created();

CREATE OR REPLACE FUNCTION public.handle_friend_request_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE receiver_name TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    INSERT INTO public.friends (user_id, friend_id) VALUES (NEW.sender_id, NEW.receiver_id) ON CONFLICT DO NOTHING;
    INSERT INTO public.friends (user_id, friend_id) VALUES (NEW.receiver_id, NEW.sender_id) ON CONFLICT DO NOTHING;
    SELECT COALESCE(full_name, username, 'Tu amigo') INTO receiver_name
      FROM public.profiles WHERE user_id = NEW.receiver_id LIMIT 1;
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (NEW.sender_id, 'friend_request_accepted', 'Solicitud aceptada',
      COALESCE(receiver_name, 'Tu amigo') || ' ha aceptado tu solicitud',
      jsonb_build_object('friend_id', NEW.receiver_id));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_friend_request_accepted
AFTER UPDATE ON public.friend_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_friend_request_accepted();

CREATE OR REPLACE FUNCTION public.handle_friendship_removed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.friends WHERE user_id = OLD.friend_id AND friend_id = OLD.user_id;
  DELETE FROM public.friend_requests
   WHERE (sender_id = OLD.user_id AND receiver_id = OLD.friend_id)
      OR (sender_id = OLD.friend_id AND receiver_id = OLD.user_id);
  RETURN OLD;
END; $$;

CREATE TRIGGER trg_friendship_removed
AFTER DELETE ON public.friends
FOR EACH ROW EXECUTE FUNCTION public.handle_friendship_removed();

CREATE OR REPLACE FUNCTION public.notify_shared_item()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sender_name TEXT; notif_type TEXT; notif_title TEXT; notif_body TEXT;
BEGIN
  SELECT COALESCE(full_name, username, 'Tu amigo') INTO sender_name
    FROM public.profiles WHERE user_id = NEW.sender_id LIMIT 1;
  IF NEW.item_type = 'song' THEN
    notif_type := 'shared_song'; notif_title := 'Nueva canción compartida';
    notif_body := COALESCE(sender_name, 'Tu amigo') || ' te ha compartido una canción';
  ELSIF NEW.item_type = 'artist' THEN
    notif_type := 'shared_artist'; notif_title := 'Nuevo artista compartido';
    notif_body := COALESCE(sender_name, 'Tu amigo') || ' te ha compartido un artista';
  ELSE
    notif_type := 'shared_card'; notif_title := 'Tarjeta digital compartida';
    notif_body := COALESCE(sender_name, 'Tu amigo') || ' te ha compartido una tarjeta';
  END IF;
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (NEW.receiver_id, notif_type, notif_title, notif_body,
    jsonb_build_object('shared_item_id', NEW.id, 'sender_id', NEW.sender_id,
      'item_type', NEW.item_type, 'item_id', NEW.item_id, 'message', NEW.message));
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_shared_item_created
AFTER INSERT ON public.shared_items
FOR EACH ROW EXECUTE FUNCTION public.notify_shared_item();

-- ============================================
-- HELPER: search users
-- ============================================
CREATE OR REPLACE FUNCTION public.search_users_for_friends(_query TEXT)
RETURNS TABLE (user_id UUID, username TEXT, full_name TEXT, avatar_url TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.username, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.user_id <> auth.uid()
    AND length(_query) >= 2
    AND (p.username ILIKE '%' || _query || '%' OR p.full_name ILIKE '%' || _query || '%')
  LIMIT 20;
$$;
