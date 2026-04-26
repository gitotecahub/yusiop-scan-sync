import { useEffect, useState } from 'react';
import { Headphones, Search, Inbox } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import AdminTicketDetailDialog from './AdminTicketDetailDialog';

interface AdminTicket {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  description: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Abierto',
  pending: 'En revisión',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};
const STATUS_COLOR: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'default',
  pending: 'secondary',
  resolved: 'outline',
  closed: 'outline',
};
const PRIORITY_LABEL: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};
const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-yusiop-accent/20 text-yusiop-accent',
  high: 'bg-destructive/20 text-destructive',
};

export default function AdminSupport() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter as any);
    if (priorityFilter !== 'all') q = q.eq('priority', priorityFilter as any);
    const { data } = await q;
    setTickets((data as AdminTicket[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('admin-support-tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter]);

  const filtered = tickets.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.subject.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Headphones className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Soporte</h1>
          <p className="text-sm text-muted-foreground">Gestión de tickets de usuarios</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por asunto, descripción o categoría…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="open">Abierto</SelectItem>
            <SelectItem value="pending">En revisión</SelectItem>
            <SelectItem value="resolved">Resuelto</SelectItem>
            <SelectItem value="closed">Cerrado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las prioridades</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Cargando tickets…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay tickets que coincidan con los filtros.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTicketId(t.id)}
              className="w-full text-left rounded-lg border bg-card hover:bg-accent transition-colors p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                    {t.category}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${PRIORITY_COLOR[t.priority]}`}
                  >
                    {PRIORITY_LABEL[t.priority]}
                  </span>
                </div>
                <p className="font-medium mt-0.5 truncate">{t.subject}</p>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={STATUS_COLOR[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: es })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <AdminTicketDetailDialog
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={(open) => {
          if (!open) setSelectedTicketId(null);
        }}
        onUpdated={load}
      />
    </div>
  );
}
