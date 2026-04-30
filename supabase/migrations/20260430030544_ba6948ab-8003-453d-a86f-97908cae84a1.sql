-- Tabla de sesiones del juego (una partida por usuario por día)
CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 5,
  played_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT game_sessions_user_date_unique UNIQUE (user_id, played_date)
);

CREATE INDEX idx_game_sessions_user_date ON public.game_sessions(user_id, played_date DESC);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own game sessions"
ON public.game_sessions FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users create own game sessions"
ON public.game_sessions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own game sessions"
ON public.game_sessions FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage game sessions"
ON public.game_sessions FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Tabla de respuestas individuales
CREATE TABLE public.game_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  song_id UUID NOT NULL,
  selected_song_id UUID,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  question_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_answers_session ON public.game_answers(session_id);
CREATE INDEX idx_game_answers_user ON public.game_answers(user_id);

ALTER TABLE public.game_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own answers"
ON public.game_answers FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users create own answers"
ON public.game_answers FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage game answers"
ON public.game_answers FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_game_sessions_updated_at
BEFORE UPDATE ON public.game_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();