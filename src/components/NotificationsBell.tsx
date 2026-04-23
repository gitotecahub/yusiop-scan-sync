import { useEffect, useState, useCallback } from 'react';
import { Bell, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: any;
  read: boolean;
  created_at: string;
}

const NotificationsBell = () => {
  const { session } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const userId = session?.user?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setItems(data as Notification[]);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!userId || unread === 0) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    load();
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', n.id);
    }
    setOpen(false);
    if (n.type === 'gift_received' && n.data?.redemption_token) {
      navigate(`/redeem/${n.data.redemption_token}`);
    }
    load();
  };

  if (!userId) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notificaciones"
          className="relative h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
        >
          <Bell className="h-5 w-5 text-destructive" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[320px] p-0 bg-background border-border"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Notificaciones</h3>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={markAllRead}
            >
              Marcar leídas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[360px]">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No tienes notificaciones
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3 ${
                      !n.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="mt-0.5">
                      {n.type === 'gift_received' ? (
                        <Gift className="h-5 w-5 text-primary" />
                      ) : (
                        <Bell className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsBell;
