import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Check, X, Music, Play, Trophy, Sparkles, ArrowLeft, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SongLite {
  id: string;
  title: string;
  artist_id: string | null;
  preview_url: string | null;
  preview_start_seconds: number | null;
  cover_url: string | null;
  artists?: { name: string } | null;
}

interface Question {
  correct: SongLite;
  options: SongLite[]; // 4 mezcladas
}

const TOTAL_QUESTIONS = 5;
const SNIPPET_MS = 1000;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const GuessSong = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [todayScore, setTodayScore] = useState<number | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [starting, setStarting] = useState(false);

  // Comprueba partida del día
  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('game_sessions')
        .select('id, score, completed_at')
        .eq('user_id', user.id)
        .eq('played_date', today)
        .maybeSingle();
      if (data && data.completed_at) {
        setAlreadyPlayed(true);
        setTodayScore(data.score);
      }
      setLoading(false);
    })();
  }, [user]);

  const startGame = async () => {
    if (!user) return;
    setStarting(true);
    try {
      // Cargar canciones con preview disponible
      const { data: songs, error } = await supabase
        .from('songs')
        .select('id, title, artist_id, preview_url, preview_start_seconds, cover_url, artists(name)')
        .not('preview_url', 'is', null)
        .limit(200);
      if (error) throw error;
      const pool = (songs ?? []) as unknown as SongLite[];
      if (pool.length < 4) {
        toast.error('No hay suficientes canciones en el catálogo');
        setStarting(false);
        return;
      }

      // Crear sesión
      const today = new Date().toISOString().slice(0, 10);
      const { data: session, error: sErr } = await supabase
        .from('game_sessions')
        .insert({ user_id: user.id, played_date: today, total_questions: TOTAL_QUESTIONS, score: 0 })
        .select()
        .single();
      if (sErr) {
        if (sErr.code === '23505') {
          setAlreadyPlayed(true);
          toast.error('Ya jugaste hoy. ¡Vuelve mañana!');
          setStarting(false);
          return;
        }
        throw sErr;
      }

      // Generar 5 preguntas (sin repetir canción correcta)
      const shuffledPool = shuffle(pool);
      const corrects = shuffledPool.slice(0, TOTAL_QUESTIONS);
      const qs: Question[] = corrects.map((correct) => {
        const distractors = shuffle(pool.filter((s) => s.id !== correct.id)).slice(0, 3);
        return { correct, options: shuffle([correct, ...distractors]) };
      });

      setSessionId(session.id);
      setQuestions(qs);
      setCurrent(0);
      setScore(0);
      setSelectedId(null);
      setRevealed(false);
      setFinished(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Error iniciando partida');
    } finally {
      setStarting(false);
    }
  };

  // Reproducir 1 segundo al cambiar de pregunta
  useEffect(() => {
    if (!questions.length || finished) return;
    const q = questions[current];
    if (!q?.correct.preview_url) return;
    const audio = new Audio(q.correct.preview_url);
    audioRef.current = audio;
    audio.currentTime = q.correct.preview_start_seconds ?? 0;
    const timer = setTimeout(() => audio.pause(), SNIPPET_MS);
    audio.play().catch(() => {});
    return () => {
      clearTimeout(timer);
      audio.pause();
    };
  }, [current, questions, finished]);

  const replaySnippet = () => {
    const q = questions[current];
    if (!q?.correct.preview_url) return;
    const audio = new Audio(q.correct.preview_url);
    audioRef.current?.pause();
    audioRef.current = audio;
    audio.currentTime = q.correct.preview_start_seconds ?? 0;
    audio.play().catch(() => {});
    setTimeout(() => audio.pause(), SNIPPET_MS);
  };

  const handleSelect = async (option: SongLite) => {
    if (revealed || !sessionId || !user) return;
    const q = questions[current];
    const isCorrect = option.id === q.correct.id;
    setSelectedId(option.id);
    setRevealed(true);
    if (isCorrect) setScore((s) => s + 1);

    await supabase.from('game_answers').insert({
      session_id: sessionId,
      user_id: user.id,
      song_id: q.correct.id,
      selected_song_id: option.id,
      is_correct: isCorrect,
      question_index: current,
    });
  };

  const nextQuestion = async () => {
    if (current + 1 >= TOTAL_QUESTIONS) {
      // Finalizar
      if (sessionId) {
        await supabase
          .from('game_sessions')
          .update({ score, completed_at: new Date().toISOString() })
          .eq('id', sessionId);
      }
      setFinished(true);
      return;
    }
    setCurrent((c) => c + 1);
    setSelectedId(null);
    setRevealed(false);
  };

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Cargando...
      </div>
    );
  }

  if (alreadyPlayed && !sessionId) {
    return (
      <div className="space-y-6">
        <Header onBack={() => navigate(-1)} />
        <Card className="p-8 text-center space-y-4 glass-strong">
          <Trophy className="h-14 w-14 mx-auto text-primary" />
          <h2 className="text-2xl font-bold">¡Ya jugaste hoy!</h2>
          <p className="text-muted-foreground">
            Tu puntuación: <span className="font-bold text-foreground">{todayScore}/{TOTAL_QUESTIONS}</span>
          </p>
          <p className="text-sm text-muted-foreground">Vuelve mañana para una nueva partida 🎵</p>
          <Button onClick={() => navigate('/catalog')} className="w-full">
            Explorar catálogo
          </Button>
        </Card>
      </div>
    );
  }

  if (!sessionId) {
    // Pantalla inicial
    return (
      <div className="space-y-6">
        <Header onBack={() => navigate(-1)} />
        <Card className="p-8 text-center space-y-5 glass-strong relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full vapor-bg opacity-30 blur-2xl" />
          <Sparkles className="h-14 w-14 mx-auto text-primary relative" />
          <h2 className="text-3xl font-bold relative">Adivina la canción</h2>
          <p className="text-muted-foreground relative">
            Escucha 1 segundo y elige el título correcto entre 4 opciones.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 relative">
            <li>🎧 5 preguntas por partida</li>
            <li>📅 1 partida al día</li>
            <li>🏆 Pon a prueba tu oído</li>
          </ul>
          <Button
            onClick={startGame}
            disabled={starting}
            size="lg"
            className="w-full vapor-bg text-primary-foreground font-bold relative"
          >
            {starting ? 'Preparando...' : '¡Empezar a jugar!'}
          </Button>
        </Card>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / TOTAL_QUESTIONS) * 100);
    return (
      <div className="space-y-6">
        <Header onBack={() => navigate(-1)} />
        <Card className="p-8 text-center space-y-4 glass-strong">
          <Trophy className="h-16 w-16 mx-auto text-primary animate-bounce" />
          <h2 className="text-3xl font-bold">¡Partida terminada!</h2>
          <div className="text-5xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {score}/{TOTAL_QUESTIONS}
          </div>
          <p className="text-muted-foreground">
            {pct === 100 ? '¡Perfecto! 🎉' : pct >= 60 ? '¡Buen oído! 🎵' : 'Sigue practicando 💪'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/catalog')} className="flex-1">
              Catálogo
            </Button>
            <Button onClick={() => navigate('/')} className="flex-1">
              Inicio
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Pregunta activa
  const q = questions[current];
  const progress = ((current + (revealed ? 1 : 0)) / TOTAL_QUESTIONS) * 100;

  return (
    <div className="space-y-5">
      <Header onBack={() => navigate(-1)} />

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Pregunta {current + 1}/{TOTAL_QUESTIONS}</span>
          <span>Puntos: {score}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="p-6 text-center space-y-4 glass-strong">
        <div className="mx-auto w-24 h-24 rounded-2xl vapor-bg flex items-center justify-center shadow-glow">
          <Music className="h-10 w-10 text-primary-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">¿Qué canción suena?</p>
        <Button variant="outline" size="sm" onClick={replaySnippet} disabled={revealed}>
          <Play className="h-4 w-4 mr-1" /> Volver a oír
        </Button>
      </Card>

      <div className="space-y-2">
        {q.options.map((opt) => {
          const isCorrect = opt.id === q.correct.id;
          const isSelected = selectedId === opt.id;
          const showCorrect = revealed && isCorrect;
          const showWrong = revealed && isSelected && !isCorrect;
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt)}
              disabled={revealed}
              className={cn(
                'w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 flex items-center gap-3',
                'hover:scale-[1.01] active:scale-[0.99]',
                !revealed && 'border-border bg-card hover:border-primary/50',
                showCorrect && 'border-green-500 bg-green-500/15 animate-pulse',
                showWrong && 'border-red-500 bg-red-500/15',
                revealed && !isCorrect && !isSelected && 'opacity-50'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{opt.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {opt.artists?.name ?? 'Artista'}
                </div>
              </div>
              {showCorrect && <Check className="h-6 w-6 text-green-500 shrink-0" />}
              {showWrong && <X className="h-6 w-6 text-red-500 shrink-0" />}
            </button>
          );
        })}
      </div>

      {revealed && (
        <Card className="p-4 space-y-3 animate-fade-in glass-strong">
          <div className="flex items-center gap-3">
            {q.correct.cover_url ? (
              <img src={q.correct.cover_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-lg vapor-bg flex items-center justify-center">
                <Music className="h-6 w-6 text-primary-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Respuesta correcta</div>
              <div className="font-bold truncate">{q.correct.title}</div>
              <div className="text-xs text-muted-foreground truncate">
                {q.correct.artists?.name}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/catalog?song=${q.correct.id}`)}
            >
              Descargar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/catalog?artist=${q.correct.artist_id}`)}
              disabled={!q.correct.artist_id}
            >
              Ver artista
            </Button>
          </div>
          <Button onClick={nextQuestion} className="w-full vapor-bg text-primary-foreground font-bold">
            {current + 1 >= TOTAL_QUESTIONS ? 'Ver resultado' : 'Siguiente'}
          </Button>
        </Card>
      )}
    </div>
  );
};

const Header = ({ onBack }: { onBack: () => void }) => (
  <div className="flex items-center gap-3">
    <Button variant="ghost" size="icon" onClick={onBack}>
      <ArrowLeft className="h-5 w-5" />
    </Button>
    <div>
      <h1 className="text-xl font-bold">Adivina la canción</h1>
      <p className="text-xs text-muted-foreground">Mini juego diario</p>
    </div>
  </div>
);

export default GuessSong;
