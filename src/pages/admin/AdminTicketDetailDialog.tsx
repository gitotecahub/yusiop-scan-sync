import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface AdminTicketDetailDialogProps {
  ticketId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export default function AdminTicketDetailDialog({
  ticketId,
  open,
  onOpenChange,
  onUpdated,
}: AdminTicketDetailDialogProps) {
  const { user } = useAuthStore();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

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
    if (t?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('user_id', t.user_id)
        .maybeSingle();
      setUserEmail(profile?.full_name || profile?.username || t.user_id);
    }
    setLoading(false);
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

  const sendReply = async () => {
    if (!ticket || !reply.trim() || !user) return;
    setSending(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        sender_type: 'admin',
        sender_user_id: user.id,
        message: reply.trim(),
      });
      if (error) throw error;
      // Marcar como pending si aún estaba open
      if (ticket.status === 'open') {
        await supabase.from('support_tickets').update({ status: 'pending' }).eq('id', ticket.id);
      }
      // Notificar al usuario
      await supabase.from('notifications').insert({
        user_id: ticket.user_id,
        type: 'support_reply',
        title: 'Respuesta de soporte',
        body: ticket.subject,
        data: { ticket_id: ticket.id },
      });
      setReply('');
      await load();
      onUpdated?.();
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo enviar la respuesta');
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (status: Ticket['status']) => {
    if (!ticket) return;
    const patch: any = { status };
    if (status === 'resolved') patch.resolved_at = new Date().toISOString();
    const { error } = await supabase.from('support_tickets').update(patch).eq('id', ticket.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Estado actualizado');
    await load();
    onUpdated?.();
  };

  const updatePriority = async (priority: Ticket['priority']) => {
    if (!ticket) return;
    const { error } = await supabase
      .from('support_tickets')
      .update({ priority })
      .eq('id', ticket.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await load();
    onUpdated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">{ticket?.subject ?? 'Ticket'}</DialogTitle>
          <DialogDescription>
            {userEmail && <span className="font-medium">{userEmail}</span>}
            {ticket && (
              <span className="ml-2 text-xs">
                · {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: es })}
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
              <Badge variant="outline">{ticket.category}</Badge>
              <Select value={ticket.status} onValueChange={(v) => updateStatus(v as Ticket['status'])}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Abierto</SelectItem>
                  <SelectItem value="pending">En revisión</SelectItem>
                  <SelectItem value="resolved">Resuelto</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={ticket.priority}
                onValueChange={(v) => updatePriority(v as Ticket['priority'])}
              >
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
              {ticket.status !== 'resolved' && (
                <Button size="sm" variant="outline" onClick={() => updateStatus('resolved')}>
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Marcar resuelto
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1 max-h-[40vh] border rounded-md p-3">
              <div className="space-y-3">
                <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-line">
                  {ticket.description}
                </div>
                {messages.map((m) => (
                  <MessageRow key={m.id} message={m} />
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Escribe una respuesta para el usuario…"
                rows={3}
                maxLength={2000}
                disabled={ticket.status === 'closed'}
              />
              <div className="flex justify-end">
                <Button onClick={sendReply} disabled={sending || !reply.trim() || ticket.status === 'closed'}>
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Enviar respuesta
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MessageRow({ message }: { message: Message }) {
  const isAdmin = message.sender_type === 'admin';
  const isAi = message.sender_type === 'ai';
  return (
    <div className={cn('flex gap-2', isAdmin && 'flex-row-reverse')}>
      <div
        className={cn(
          'h-7 w-7 rounded-full shrink-0 flex items-center justify-center',
          isAdmin ? 'bg-primary text-primary-foreground' : isAi ? 'vapor-bg text-primary-foreground' : 'bg-muted',
        )}
      >
        {isAdmin ? <ShieldCheck className="h-4 w-4" /> : isAi ? <Bot className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line',
          isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}
      >
        <p>{message.message}</p>
        <p className={cn('text-[10px] mt-1 opacity-70')}>
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: es })}
        </p>
      </div>
    </div>
  );
}
