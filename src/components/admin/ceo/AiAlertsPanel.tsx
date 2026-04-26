import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CeoAlert } from '@/lib/ceoCenter';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AlertTriangle, Bell, ChevronDown, ShieldAlert, User, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  data?: CeoAlert[];
  isLoading: boolean;
}

const SEV = {
  low: { cls: 'bg-muted text-muted-foreground border-border', label: 'Baja' },
  medium: { cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30', label: 'Media' },
  high: { cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', label: 'Alta' },
  critical: { cls: 'bg-red-500/15 text-red-300 border-red-500/30', label: 'Crítica' },
} as const;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

export function AiAlertsPanel({ data, isLoading }: Props) {
  return (
    <Card className="border-border/50 bg-background/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold">Alertas IA</h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No hay alertas en este periodo.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((a) => {
            const cfg = SEV[a.severity];
            const users = a.data?.users ?? [];
            const ips = a.data?.ips ?? [];
            const hasDetails = users.length > 0 || ips.length > 0;
            return (
              <li key={a.id} className="rounded-lg border border-border/50 bg-background/40 p-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0',
                    a.severity === 'critical' ? 'text-red-400'
                    : a.severity === 'high' ? 'text-amber-400'
                    : 'text-sky-400'
                  )} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{a.title}</span>
                      <Badge variant="outline" className={cn('shrink-0 text-[10px]', cfg.cls)}>{cfg.label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                    <p className="mt-1 text-xs italic text-muted-foreground/80">→ {a.recommendation}</p>

                    {hasDetails && (
                      <Collapsible className="mt-2">
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-full justify-between gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <span>
                              Ver detalle
                              {users.length > 0 && ` · ${users.length} usuarios`}
                              {ips.length > 0 && ` · ${ips.length} IPs`}
                            </span>
                            <ChevronDown className="h-3 w-3 transition-transform [&[data-state=open]]:rotate-180" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-2">
                          {users.length > 0 && (
                            <div className="rounded-md border border-border/40 bg-background/60 p-2">
                              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                <User className="h-3 w-3" /> Usuarios sospechosos
                              </div>
                              <ul className="divide-y divide-border/30">
                                {users.map((u) => (
                                  <li key={u.user_id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-medium">{u.full_name || u.email}</div>
                                      {u.full_name && (
                                        <div className="truncate text-[10px] text-muted-foreground">{u.email}</div>
                                      )}
                                      {u.notes && (
                                        <div className="mt-0.5 truncate text-[10px] italic text-muted-foreground/70">{u.notes}</div>
                                      )}
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                                      <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-[10px] text-red-300">
                                        Score {u.score}
                                      </Badge>
                                      <span className="text-[10px] text-muted-foreground">{formatDate(u.last_event_at)}</span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {ips.length > 0 && (
                            <div className="rounded-md border border-border/40 bg-background/60 p-2">
                              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                <Globe className="h-3 w-3" /> IPs repetidas
                              </div>
                              <ul className="divide-y divide-border/30">
                                {ips.map((ip) => (
                                  <li key={ip.ip_address} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-mono font-medium">{ip.ip_address}</div>
                                      <div className="truncate text-[10px] text-muted-foreground">
                                        {[ip.city, ip.country_name].filter(Boolean).join(', ') || 'Ubicación desconocida'}
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                                      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-300">
                                        {ip.unique_users} cuentas
                                      </Badge>
                                      <span className="text-[10px] text-muted-foreground">{ip.total_downloads} descargas</span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
