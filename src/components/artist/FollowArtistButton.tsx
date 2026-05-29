import { Heart } from 'lucide-react';
import { useArtistFollow } from '@/hooks/useArtistFollow';
import { cn } from '@/lib/utils';

interface Props {
  artistId: string | null | undefined;
  className?: string;
  size?: 'sm' | 'md';
}

const FollowArtistButton = ({ artistId, className, size = 'md' }: Props) => {
  const { following, loading, toggle } = useArtistFollow(artistId);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggle(); }}
      disabled={loading || !artistId}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-display font-bold transition-all',
        size === 'sm' ? 'px-2.5 h-7 text-[11px]' : 'px-3 h-8 text-xs',
        following
          ? 'border-primary/60 vapor-bg text-primary-foreground shadow-glow'
          : 'border-border bg-card/50 hover:border-primary/50 text-foreground',
        className,
      )}
      aria-pressed={following}
    >
      <Heart className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} fill={following ? 'currentColor' : 'none'} />
      {following ? 'Siguiendo' : 'Seguir'}
    </button>
  );
};

export default FollowArtistButton;
