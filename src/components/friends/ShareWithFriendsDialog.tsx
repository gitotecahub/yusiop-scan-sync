import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useFriends } from '@/hooks/useFriends';
import { useNavigate } from 'react-router-dom';

interface ShareWithFriendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: 'song' | 'artist' | 'digital_card';
  itemId: string;
  itemTitle?: string;
}

const ShareWithFriendsDialog = ({
  open,
  onOpenChange,
  itemType,
  itemId,
  itemTitle,
}: ShareWithFriendsDialogProps) => {
  const { friends, shareItem } = useFriends();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setMessage('');
    }
  }, [open]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleSend = async () => {
    if (selected.size === 0) return;
    setSending(true);
    const { error } = await shareItem(Array.from(selected), itemType, itemId, message.trim() || undefined);
    setSending(false);
    if (error) {
      toast.error('No se pudo compartir');
    } else {
      toast.success(`Compartido con ${selected.size} amigo(s)`);
      onOpenChange(false);
    }
  };

  const typeLabel =
    itemType === 'song' ? 'la canción' : itemType === 'artist' ? 'el artista' : 'la tarjeta digital';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Compartir con amigos
          </DialogTitle>
          <DialogDescription>
            Selecciona los amigos con los que quieres compartir {typeLabel}
            {itemTitle ? ` "${itemTitle}"` : ''}.
          </DialogDescription>
        </DialogHeader>

        {friends.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Aún no tienes amigos en Yusiop.</p>
            <Button
              onClick={() => {
                onOpenChange(false);
                navigate('/friends');
              }}
              className="rounded-full bg-gradient-to-r from-yusiop-primary via-yusiop-accent to-yusiop-secondary"
            >
              Buscar amigos
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[280px] pr-2">
              <ul className="space-y-1">
                {friends.map((f) => {
                  const checked = selected.has(f.user_id);
                  return (
                    <li key={f.user_id}>
                      <button
                        type="button"
                        onClick={() => toggle(f.user_id)}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
                          checked ? 'bg-primary/10' : 'hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggle(f.user_id)} />
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={f.avatar_url || undefined} />
                          <AvatarFallback>
                            {(f.full_name || f.username || '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold truncate">
                            {f.full_name || f.username || 'Usuario'}
                          </p>
                          {f.username && (
                            <p className="text-xs text-muted-foreground truncate">@{f.username}</p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>

            <Input
              placeholder="Mensaje (opcional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={selected.size === 0 || sending}
                className="rounded-full bg-gradient-to-r from-yusiop-primary via-yusiop-accent to-yusiop-secondary"
              >
                <Send className="h-4 w-4 mr-1.5" />
                Enviar ({selected.size})
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareWithFriendsDialog;
