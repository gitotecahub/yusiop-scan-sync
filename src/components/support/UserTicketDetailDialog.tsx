import { useEffect, useState, useRef } from 'react';
import { Loader2, Send, ShieldCheck, User as UserIcon, Bot } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Ticket {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  description: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

interface Message {
  id: string;
  sender_type: 'user' | 'ai' | 'admin';
  message: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Abierto',
  pending: 'En revisión',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  open: 'default',
  pending: 'secondary',
  resolved: 'outline',
  closed: 'outline',
};

interface Props {
  ticketId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export default function UserTicketDetailDialog({ ticketId, open, onOpenChange, onUpdated }: Props) {
  const { user } = useAuthStore();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!ticketId) return;
    setLoading(true);
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from('support_tickets').select('*').eq('id', ticketId).maybeSingle(),
      supabase
        .from('support_messages')
        .select('id, sender_type, message, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true }),
    ]);
    setTicket(t as Ticket | null);
    setMessages((m as Message[]) ?? []);
    setLoading(false);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    if (open && ticketId) load();
    if (!open) {
      setTicket(null);
      setMessages([]);
      setReply('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ticketId]);

  // Realtime updates while the dialog is open
  useEffect(() => {
    if (!open || !ticketId) return;
    const channel = supabase
      .channel(`user-ticket-${ticketId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticketId}` },
        () => load(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${ticketId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ticketId]);

  const sendReply = async () => {
    if (!ticket || !reply.trim() || !user) return;
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      toast.error('Este ticket ya está cerrado. Crea uno nuevo si necesitas más ayuda.');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        sender_type: 'user',
        sender_user_id: user.id,
        message: reply.trim(),
      });
      if (error) throw error;
      setReply('');
      await load();
      onUpdated?.();
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo enviar la respuesta');
    } finally {
      setSending(false);
    }
  };

  const canReply = ticket && (ticket.status === 'open' || ticket.status === 'pending');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{ticket?.subject ?? 'Ticket'}</DialogTitle>
          <DialogDescription>
            {ticket && (
              <span className="text-xs">
                {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: es })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading || !ticket ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="outline" className="capitalize">{ticket.category}</Badge>
              <Badge variant={STATUS_VARIANT[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>
            </div>

            <div ref={scrollRef as any} className="flex-1 overflow-y-auto border rounded-md p-3 max-h-[45vh]">
              <div className="space-y-3">
                <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-line">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    Tu mensaje inicial
                  </p>
                  {ticket.description}
                </div>
                {messages.map((m) => (
                  <MessageRow key={m.id} message={m} />
                ))}
                {messages.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-4">
                    Aún no hay respuestas. El equipo te contestará pronto.
                  </p>
                )}
              </div>
            </div>

            {canReply ? (
              <div className="space-y-2">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Escribe tu respuesta…"
                  rows={3}
                  maxLength={2000}
                />
                <div className="flex justify-end">
                  <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Enviar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-center text-muted-foreground">
                Este ticket está {STATUS_LABEL[ticket.status].toLowerCase()}. Si necesitas más ayuda, abre uno nuevo.
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MessageRow({ message }: { message: Message }) {
  const isUser = message.sender_type === 'user';
  const isAdmin = message.sender_type === 'admin';
  const isAi = message.sender_type === 'ai';
  return (
    <div className={cn('flex gap-2', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'h-7 w-7 rounded-full shrink-0 flex items-center justify-center',
          isUser
            ? 'bg-primary text-primary-foreground'
            : isAdmin
              ? 'bg-yusiop-accent text-primary-foreground'
              : 'vapor-bg text-primary-foreground',
        )}
      >
        {isUser ? <UserIcon className="h-4 w-4" /> : isAdmin ? <ShieldCheck className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}
      >
        {isAdmin && (
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80 mb-0.5">
            Soporte YUSIOP
          </p>
        )}
        <p>{message.message}</p>
        <p className="text-[10px] mt-1 opacity-70">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: es })}
        </p>
      </div>
    </div>
  );
}
