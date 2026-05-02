import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';
import GiftSongDialog from './GiftSongDialog';
import { cn } from '@/lib/utils';

interface GiftSongButtonProps {
  songId: string;
  songTitle: string;
  artistName: string;
  variant?: 'default' | 'icon' | 'compact';
  className?: string;
}

const GiftSongButton = ({
  songId,
  songTitle,
  artistName,
  variant = 'default',
  className,
}: GiftSongButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === 'icon' ? (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setOpen(true)}
          className={cn('rounded-full', className)}
          aria-label="Regalar canción"
        >
          <Gift className="h-4 w-4" />
        </Button>
      ) : variant === 'compact' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline',
            className,
          )}
        >
          <Gift className="h-3.5 w-3.5" />
          Regalar
        </button>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          className={cn(
            'rounded-full bg-gradient-to-r from-yusiop-primary via-yusiop-accent to-yusiop-secondary',
            className,
          )}
        >
          <Gift className="h-4 w-4 mr-1.5" />
          Regalar canción
        </Button>
      )}

      <GiftSongDialog
        open={open}
        onOpenChange={setOpen}
        songId={songId}
        songTitle={songTitle}
        artistName={artistName}
      />
    </>
  );
};

export default GiftSongButton;
