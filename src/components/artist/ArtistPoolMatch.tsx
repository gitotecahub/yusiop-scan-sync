import { useEffect, useState } from 'react';
import { AlertTriangle, Coins, ShieldCheck, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface PoolMatch {
  artist_id: string;
  artist_name: string;
  avatar_url: string | null;
  similarity: number;
  total_pool_xaf: number;
  already_claimed: boolean;
}

export const ArtistPoolMatch = ({ stageName }: { stageName: string }) => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<PoolMatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const name = stageName.trim();
    if (name.length < 3) { setMatches([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const { data } = await (supabase as any).rpc('find_artist_pool_matches', { p_stage_name: name });
      setMatches((data ?? []) as PoolMatch[]);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [stageName]);

  if (matches.length === 0) return null;

  const fmt = (xaf: number) => new Intl.NumberFormat('fr-FR').format(xaf) + ' XAF';

  return (
    <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Coincidencias en el catálogo</p>
            <p className="text-xs text-muted-foreground">
              Detectamos artistas con un nombre parecido al tuyo. Si eres alguno de ellos, puedes reclamar sus ganancias acumuladas.
            </p>
          </div>
        </div>
        <ul className="space-y-2">
          {matches.map(m => (
            <li key={m.artist_id} className="flex items-center gap-3 p-2 rounded-lg bg-background/60">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt={m.artist_name} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-2">
                  {m.artist_name}
                  {m.already_claimed && (
                    <Badge variant="secondary" className="text-[10px]">
                      <ShieldCheck className="h-3 w-3 mr-0.5" />Reclamado
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Coins className="h-3 w-3" /> {fmt(m.total_pool_xaf)} acumulado
                </p>
              </div>
              <Button
                size="sm"
                variant={m.already_claimed ? 'outline' : 'default'}
                disabled={m.already_claimed}
                onClick={() => navigate(`/artist/claim?artistId=${m.artist_id}&name=${encodeURIComponent(m.artist_name)}`)}
              >
                Soy yo <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </li>
          ))}
        </ul>
        {loading && <p className="text-xs text-muted-foreground">Buscando…</p>}
      </CardContent>
    </Card>
  );
};
