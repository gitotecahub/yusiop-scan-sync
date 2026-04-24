import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Play, ArrowLeft, Download, Heart, Share2, Headphones } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguageStore } from '@/stores/languageStore';

type Period = 'today' | 'week' | 'month' | 'all';

interface PopularRow {
  song_id: string;
  title: string;
  artist_name: string;
  cover_url: string | null;
  genre: string | null;
  downloads_count: number;
  redemptions_count: number;
  plays_count: number;
  favorites_count: number;
  shares_count: number;
  popularity_score: number;
}

const Popular = () => {
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const [period, setPeriod] = useState<Period>('week');
  const [genre, setGenre] = useState<string>('all');
  const [songs, setSongs] = useState<PopularRow[]>([]);
  const [loading, setLoading] = useState(true);

  const L = {
    title:
      language === 'es' ? 'Más popular en YUSIOP' :
      language === 'en' ? 'Most popular on YUSIOP' :
      language === 'fr' ? 'Plus populaire sur YUSIOP' :
      'Mais popular no YUSIOP',
    subtitle:
      language === 'es' ? 'Ranking global de la plataforma' :
      language === 'en' ? 'Global platform ranking' :
      language === 'fr' ? 'Classement global de la plateforme' :
      'Ranking global da plataforma',
    today: language === 'es' ? 'Hoy' : language === 'en' ? 'Today' : language === 'fr' ? 'Aujourd\'hui' : 'Hoje',
    week: language === 'es' ? 'Semana' : language === 'en' ? 'Week' : language === 'fr' ? 'Semaine' : 'Semana',
    month: language === 'es' ? 'Mes' : language === 'en' ? 'Month' : language === 'fr' ? 'Mois' : 'Mês',
    all: language === 'es' ? 'Histórico' : language === 'en' ? 'All time' : language === 'fr' ? 'Historique' : 'Histórico',
    allGenres: language === 'es' ? 'Todos los géneros' : language === 'en' ? 'All genres' : language === 'fr' ? 'Tous genres' : 'Todos gêneros',
    empty:
      language === 'es' ? 'Aún no hay actividad suficiente para este periodo' :
      language === 'en' ? 'Not enough activity yet for this period' :
      language === 'fr' ? 'Pas encore assez d\'activité pour cette période' :
      'Ainda sem atividade suficiente para este período',
    score: language === 'es' ? 'Puntuación' : language === 'en' ? 'Score' : language === 'fr' ? 'Score' : 'Pontuação',
  };

  useEffect(() => {
    let cancelled = false;
    const fetchPopular = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_popular_songs', {
        p_period: period,
        p_limit: 50,
      });
      if (cancelled) return;
      if (error) {
        console.error('get_popular_songs error', error);
        setSongs([]);
      } else {
        let rows = (data || []) as PopularRow[];
        if (genre !== 'all') {
          rows = rows.filter((r) => (r.genre || '').toLowerCase() === genre.toLowerCase());
        }
        setSongs(rows);
      }
      setLoading(false);
    };
    fetchPopular();
    return () => {
      cancelled = true;
    };
  }, [period, genre]);

  const goSong = (id: string) => navigate('/catalog', { state: { highlightSongId: id } });

  // Géneros únicos derivados de los resultados (placeholder: backend devuelve null por ahora)
  const genres = Array.from(
    new Set(songs.map((s) => s.genre).filter(Boolean) as string[])
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          className="shrink-0 w-10 h-10 rounded-2xl border border-border bg-card/40 flex items-center justify-center hover:bg-card transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl vapor-bg shadow-glow shrink-0">
              <Flame className="h-4 w-4 text-primary-foreground" />
            </span>
            <h1 className="font-display font-bold text-xl leading-tight">{L.title}</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-10">{L.subtitle}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex gap-1.5 p-1 rounded-2xl bg-card/40 border border-border w-fit">
          {(['today', 'week', 'month', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                period === p
                  ? 'vapor-bg text-primary-foreground shadow-glow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {L[p]}
            </button>
          ))}
        </div>

        {genres.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setGenre('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                genre === 'all'
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {L.allGenres}
            </button>
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  genre === g
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : songs.length > 0 ? (
        <div className="space-y-2">
          {songs.map((song, idx) => (
            <button
              key={song.song_id}
              onClick={() => goSong(song.song_id)}
              className="group w-full flex items-center gap-3 p-3 rounded-2xl border border-border bg-card/40 hover:bg-card hover:border-primary/40 transition-all text-left"
            >
              <span className="w-7 text-center font-display font-bold text-xl vapor-text shrink-0">
                {idx + 1}
              </span>
              <img
                src={
                  song.cover_url ||
                  `https://picsum.photos/200/200?random=${song.song_id}`
                }
                alt={song.title}
                className="w-14 h-14 rounded-xl object-cover shrink-0"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm line-clamp-1">{song.title}</h3>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {song.artist_name}
                </p>
                <div className="flex items-center gap-2.5 mt-1 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5">
                    <Download className="h-2.5 w-2.5" /> {song.downloads_count}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Headphones className="h-2.5 w-2.5" /> {song.plays_count}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Heart className="h-2.5 w-2.5" /> {song.favorites_count}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Share2 className="h-2.5 w-2.5" /> {song.shares_count}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {L.score}
                </div>
                <div className="font-display font-bold text-sm vapor-text">
                  {Math.round(song.popularity_score)}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-background/80 border border-border group-hover:vapor-bg group-hover:border-transparent flex items-center justify-center transition-all shrink-0">
                <Play className="h-3.5 w-3.5 text-foreground group-hover:text-primary-foreground ml-0.5" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center">
          <Flame className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">{L.empty}</p>
        </div>
      )}
    </div>
  );
};

export default Popular;
