import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditEntry {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_state: unknown;
  after_state: unknown;
  metadata: unknown;
  created_at: string;
}

const ENTITY_TYPES = [
  'all',
  'recharge_cards',
  'qr_cards',
  'artist_withdrawal_requests',
  'admin_financial_settings',
  'user_roles',
  'staff_permissions',
];

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (entityFilter !== 'all') {
      query = query.eq('entity_type', entityFilter);
    }

    const { data, error } = await query;
    if (!error && data) setEntries(data as AuditEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [entityFilter]);

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      e.actor_email?.toLowerCase().includes(s) ||
      e.action.toLowerCase().includes(s) ||
      e.entity_id?.toLowerCase().includes(s)
    );
  });

  const actionColor = (action: string) => {
    if (action.startsWith('DELETE')) return 'destructive';
    if (action.startsWith('INSERT')) return 'default';
    return 'secondary';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            Registro inmutable de acciones administrativas sensibles
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Buscar por email, acción o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === 'all' ? 'Todas las entidades' : t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Últimas 200 acciones {loading && <Loader2 className="inline h-4 w-4 animate-spin ml-2" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {filtered.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sin entradas para los filtros aplicados.
              </p>
            )}
            <div className="space-y-2">
              {filtered.map((e) => (
                <div
                  key={e.id}
                  className="border rounded-lg p-3 text-sm hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={actionColor(e.action) as 'default' | 'secondary' | 'destructive'}>
                        {e.action}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {e.entity_type}
                      </span>
                      {e.entity_id && (
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                          {e.entity_id}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Actor: <span className="font-medium text-foreground">{e.actor_email ?? 'sistema'}</span>
                  </div>
                  {(e.before_state || e.after_state) && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-primary hover:underline">
                        Ver diff
                      </summary>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {e.before_state ? (
                          <pre className="bg-destructive/10 text-xs p-2 rounded overflow-x-auto max-h-48">
                            {JSON.stringify(e.before_state, null, 2)}
                          </pre>
                        ) : <div />}
                        {e.after_state ? (
                          <pre className="bg-primary/10 text-xs p-2 rounded overflow-x-auto max-h-48">
                            {JSON.stringify(e.after_state, null, 2)}
                          </pre>
                        ) : <div />}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
