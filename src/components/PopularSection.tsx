import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Play, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguageStore } from '@/stores/languageStore';

type Period = 'today' | 'week' | 'month';

interface PopularRow {
  song_id: string;
  title: string;
  artist_name: string;
  cover_url: string | null;
  popularity_score: number;
}

const PopularSection = () => {
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const [period, setPeriod] = useState<Period>('week');
  const [songs, setSongs] = useState<PopularRow[]>([]);
  const [loading, setLoading] = useState(true);

  const labels = {
    title:
      language === 'es' ? 'Más popular en YUSIOP' :
      language === 'en' ? 'Most popular on YUSIOP' :
      language === 'fr' ? 'Plus populaire sur YUSIOP' :
      'Mais popular no YUSIOP',
    subtitle:
      language === 'es' ? 'Lo que más se está moviendo ahora' :
      language === 'en' ? 'What\'s trending right now' :
      language === 'fr' ? 'Ce qui bouge en ce moment' :
      'O que está bombando agora',
    seeAll:
      language === 'es' ? 'Ver todo' :
      language === 'en' ? 'See all' :
      language === 'fr' ? 'Voir tout' :
      'Ver tudo',
    today: language === 'es' ? 'Hoy' : language === 'en' ? 'Today' : language === 'fr' ? 'Aujourd\'hui' : 'Hoje',
    week: language === 'es' ? 'Semana' : language === 'en' ? 'Week' : language === 'fr' ? 'Semaine' : 'Semana',
    month: language === 'es' ? 'Mes' : language === 'en' ? 'Month' : language === 'fr' ? 'Mois' : 'Mês',
    empty:
      language === 'es' ? 'Aún no hay actividad suficiente' :
      language === 'en' ? 'Not enough activity yet' :
      language === 'fr' ? 'Pas encore assez d\'activité' :
      'Ainda sem atividade suficiente',
  };

  useEffect(() => {
    let cancelled = false;
    const fetchPopular = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_popular_songs', {
        p_period: period,
        p_limit: 6,
      });
      if (cancelled) return;
      if (error) {
        console.error('get_popular_songs error', error);
        setSongs([]);
      } else {
        setSongs((data || []) as PopularRow[]);
      }
      setLoading(false);
    };
    fetchPopular();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const goSong = (id: string) => navigate('/catalog', { state: { highlightSongId: id } });

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl vapor-bg shadow-glow shrink-0">
              <Flame className="h-3.5 w-3.5 text-primary-foreground" />
            </span>
            <h2 className="font-display font-bold text-lg leading-tight truncate">{labels.title}</h2>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 ml-9">{labels.subtitle}</p>
        </div>
        <button
          onClick={() => navigate('/popular')}
          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          {labels.seeAll}
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 p-1 rounded-2xl bg-card/40 border border-border w-fit">
        {(['today', 'week', 'month'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              period === p
                ? 'vapor-bg text-primary-foreground shadow-glow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {labels[p]}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : songs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {songs.map((song, idx) => (
            <button
              key={song.song_id}
              onClick={() => goSong(song.song_id)}
              className="group flex items-center gap-3 p-2 rounded-2xl border border-border bg-card/40 hover:bg-card hover:border-primary/40 transition-all text-left"
            >
              <span className="w-6 text-center font-display font-bold text-lg vapor-text shrink-0">
                {idx + 1}
              </span>
              <img
                src={
                  song.cover_url ||
                  `https://picsum.photos/200/200?random=${song.song_id}`
                }
                alt={song.title}
                className="w-11 h-11 rounded-xl object-cover shrink-0"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm line-clamp-1">{song.title}</h3>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{song.artist_name}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-background/80 border border-border group-hover:vapor-bg group-hover:border-transparent flex items-center justify-center transition-all shrink-0">
                <Play className="h-3.5 w-3.5 text-foreground group-hover:text-primary-foreground ml-0.5" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-6 text-center">
          <p className="text-xs text-muted-foreground">{labels.empty}</p>
        </div>
      )}
    </section>
  );
};

export default PopularSection;
