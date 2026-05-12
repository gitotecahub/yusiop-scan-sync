import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguageStore } from '@/stores/languageStore';
import SongCarousel, { CarouselSong } from './SongCarousel';

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
  const [songs, setSongs] = useState<CarouselSong[]>([]);
  const [loading, setLoading] = useState(true);

  const L = {
    title:
      language === 'es' ? 'Más popular en YUSIOP' :
      language === 'en' ? 'Most popular on YUSIOP' :
      language === 'fr' ? 'Plus populaire sur YUSIOP' :
      'Mais popular no YUSIOP',
    subtitle:
      language === 'es' ? 'Lo que más se está moviendo ahora' :
      language === 'en' ? "What's trending right now" :
      language === 'fr' ? 'Ce qui bouge en ce moment' :
      'O que está bombando agora',
    today: language === 'es' ? 'Hoy' : language === 'en' ? 'Today' : language === 'fr' ? "Aujourd'hui" : 'Hoje',
    week: language === 'es' ? 'Semana' : language === 'en' ? 'Week' : language === 'fr' ? 'Semaine' : 'Semana',
    month: language === 'es' ? 'Mes' : language === 'en' ? 'Month' : language === 'fr' ? 'Mois' : 'Mês',
    empty:
      language === 'es' ? 'Aún no hay actividad suficiente' :
      language === 'en' ? 'Not enough activity yet' :
      language === 'fr' ? "Pas encore assez d'activité" :
      'Ainda sem atividade suficiente',
  };

  useEffect(() => {
    let cancelled = false;
    const fetchPopular = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_popular_songs', {
        p_period: period,
        p_limit: 10,
      });
      if (cancelled) return;
      if (error) {
        console.error('get_popular_songs error', error);
        setSongs([]);
      } else {
        const rows = (data || []) as PopularRow[];
        const ids = rows.map((r) => r.song_id);
        const featsBySong: Record<string, string[]> = {};
        if (ids.length > 0) {
          const { data: collabs } = await supabase
            .from('song_collaborators')
            .select('song_id, artist_name, is_primary')
            .in('song_id', ids);
          (collabs || []).forEach((c: any) => {
            if (c.is_primary) return;
            if (!featsBySong[c.song_id]) featsBySong[c.song_id] = [];
            featsBySong[c.song_id].push(c.artist_name);
          });
        }
        setSongs(
          rows.map((r, idx) => {
            const feats = featsBySong[r.song_id] || [];
            return {
              id: r.song_id,
              title: r.title,
              artist: feats.length > 0 ? `${r.artist_name} ft ${feats.join(', ')}` : r.artist_name,
              cover_url:
                r.cover_url || `https://picsum.photos/300/300?random=${r.song_id}`,
              rank: idx + 1,
            };
          })
        );
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
    <SongCarousel
      title={L.title}
      eyebrow="🔥 Top global"
      subtitle={L.subtitle}
      seeAllHref="/popular"
      seeAllLabel={language === 'es' ? 'Ver todo' : language === 'en' ? 'See all' : language === 'fr' ? 'Voir tout' : 'Ver tudo'}
      headerExtra={
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
              {L[p]}
            </button>
          ))}
        </div>
      }
      songs={songs}
      loading={loading}
      onSongClick={goSong}
      emptyText={L.empty}
      showRank
    />
  );
};

export default PopularSection;
