import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ReactNode } from 'react';

export interface CarouselSong {
  id: string;
  title: string;
  artist: string;
  cover_url: string;
  badge?: ReactNode;
  rank?: number;
}

interface Props {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  headerExtra?: ReactNode;
  songs: CarouselSong[];
  loading?: boolean;
  onSongClick: (id: string) => void;
  emptyText?: string;
  showRank?: boolean;
}

const SongCarousel = ({
  title,
  eyebrow,
  subtitle,
  seeAllHref,
  seeAllLabel = 'Ver todo',
  headerExtra,
  songs,
  loading,
  onSongClick,
  emptyText,
  showRank,
}: Props) => {
  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 px-0">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h2 className="font-display text-xl font-bold tracking-tight leading-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {seeAllHref && (
          <Link
            to={seeAllHref}
            className="shrink-0 text-xs text-primary hover:underline underline-offset-4 font-semibold"
          >
            {seeAllLabel} →
          </Link>
        )}
      </div>

      {headerExtra}

      {/* Carrusel */}
      {loading ? (
        <div className="flex gap-3 overflow-hidden -mx-5 px-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="shrink-0 w-[140px] h-[180px] rounded-2xl bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : songs.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 snap-x snap-mandatory scroll-smooth">
          {songs.map((song) => (
            <button
              key={song.id}
              onClick={() => onSongClick(song.id)}
              className="snap-start group relative shrink-0 w-[140px] rounded-2xl overflow-hidden border border-border md:hover:border-primary/50 md:hover:-translate-y-1 md:hover:shadow-vapor transition-all text-left animate-fade-in"
            >
              <div className="relative w-[140px] h-[140px] overflow-hidden">
                <img
                  src={song.cover_url}
                  alt={song.title}
                  className="absolute inset-0 w-full h-full object-cover md:group-hover:scale-110 md:transition-transform md:duration-700"
                  loading="lazy"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent pointer-events-none" />
                {song.badge && (
                  <span className="absolute top-1.5 right-1.5">{song.badge}</span>
                )}
                <div className="absolute bottom-1.5 right-1.5 w-8 h-8 rounded-full vapor-bg items-center justify-center opacity-0 md:group-hover:opacity-100 transition-opacity shadow-glow flex">
                  <Play className="h-3.5 w-3.5 text-primary-foreground ml-0.5" />
                </div>
              </div>
              <div className="p-2">
                <h3 className="font-display font-bold text-xs leading-tight line-clamp-1">
                  {song.title}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {song.artist}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="vapor-card p-6 text-center">
          <p className="text-sm text-muted-foreground">{emptyText || 'Sin contenido aún'}</p>
        </div>
      )}
    </section>
  );
};

export default SongCarousel;
