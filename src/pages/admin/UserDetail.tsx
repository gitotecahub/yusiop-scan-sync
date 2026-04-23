import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Download,
  Euro,
  Gift,
  Heart,
  Pin,
  PinOff,
  QrCode,
  ShieldCheck,
  StickyNote,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { formatEURNumber, formatXAFNumber } from '@/lib/currency';

const formatEur = (cents: number) => formatEURNumber(cents / 100);
const formatXaf = (cents: number) => formatXAFNumber(cents / 100);
const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleString('es-ES') : '—');

const UserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadAll = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [p, r, pur, c, dl, fav, n] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle(),
        supabase
          .from('card_purchases')
          .select('*')
          .eq('buyer_user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('qr_cards')
          .select('*')
          .or(`owner_user_id.eq.${userId},activated_by.eq.${userId}`)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_downloads')
          .select('id, downloaded_at, song_id, songs(title, artists(name))')
          .eq('user_id', userId)
          .order('downloaded_at', { ascending: false })
          .limit(50),
        supabase
          .from('user_favorites')
          .select('id, created_at, songs(title, artists(name))')
          .eq('user_id', userId),
        supabase
          .from('admin_user_notes')
          .select('*')
          .eq('target_user_id', userId)
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false }),
      ]);

      setProfile(p.data);
      setIsAdminRole(!!r.data);
      setPurchases(pur.data ?? []);
      setCards(c.data ?? []);
      setDownloads(dl.data ?? []);
      setFavorites(fav.data ?? []);
      setNotes(n.data ?? []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'No se pudo cargar el usuario', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const totalSpentCents = purchases
    .filter((p) => p.status === 'paid')
    .reduce((acc, p) => acc + (p.amount_cents ?? 0), 0);
  const totalCredits = cards.reduce((acc, c) => acc + (c.download_credits ?? 0), 0);

  // Segmento automático
  const segment = (() => {
    if (purchases.length >= 3) return { label: 'VIP', variant: 'default' as const };
    if (purchases.length >= 1) return { label: 'Cliente', variant: 'secondary' as const };
    if (cards.some((c) => c.is_gift && c.gift_redeemed)) return { label: 'Canjeó regalo', variant: 'secondary' as const };
    return { label: 'Sin compras', variant: 'outline' as const };
  })();

  const addNote = async () => {
    if (!newNote.trim() || !userId || !currentUser) return;
    setSavingNote(true);
    try {
      const { error } = await supabase.from('admin_user_notes').insert({
        target_user_id: userId,
        author_user_id: currentUser.id,
        note: newNote.trim(),
      });
      if (error) throw error;
      setNewNote('');
      const { data } = await supabase
        .from('admin_user_notes')
        .select('*')
        .eq('target_user_id', userId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      setNotes(data ?? []);
      toast({ title: 'Nota añadida' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'No se pudo añadir la nota', variant: 'destructive' });
    } finally {
      setSavingNote(false);
    }
  };

  const togglePin = async (note: any) => {
    await supabase.from('admin_user_notes').update({ pinned: !note.pinned }).eq('id', note.id);
    loadAll();
  };

  const deleteNote = async (id: string) => {
    await supabase.from('admin_user_notes').delete().eq('id', id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
        <p className="mt-6 text-muted-foreground">Usuario no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {(profile.username ?? profile.full_name ?? 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
                {profile.full_name || profile.username || 'Sin nombre'}
                {isAdminRole && (
                  <Badge variant="default" className="gap-1">
                    <ShieldCheck className="h-3 w-3" /> Admin
                  </Badge>
                )}
                <Badge variant={segment.variant}>{segment.label}</Badge>
              </h1>
              <p className="text-sm text-muted-foreground">@{profile.username ?? '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Registrado el {formatDate(profile.created_at)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4 mt-6">
            <MiniStat icon={Euro} label="Total gastado" value={formatEur(totalSpentCents)} />
            <MiniStat icon={QrCode} label="Tarjetas" value={cards.length} />
            <MiniStat icon={Download} label="Créditos restantes" value={totalCredits} />
            <MiniStat icon={Heart} label="Favoritos" value={favorites.length} />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="purchases">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="purchases">Compras ({purchases.length})</TabsTrigger>
          <TabsTrigger value="cards">Tarjetas ({cards.length})</TabsTrigger>
          <TabsTrigger value="downloads">Descargas ({downloads.length})</TabsTrigger>
          <TabsTrigger value="favorites">Favoritos ({favorites.length})</TabsTrigger>
          <TabsTrigger value="notes">
            <StickyNote className="h-4 w-4 mr-1" /> Notas ({notes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de compras</CardTitle>
              <CardDescription>Pagos a través de Stripe</CardDescription>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Sin compras aún</p>
              ) : (
                <div className="space-y-2">
                  {purchases.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors"
                    >
                      <div>
                        <p className="font-medium">
                          {p.card_type === 'premium' ? 'Premium' : 'Standard'} · {p.download_credits} créditos
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatEur(p.amount_cents)}</p>
                        <Badge
                          variant={p.status === 'paid' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tarjetas QR</CardTitle>
              <CardDescription>Compradas, regaladas o canjeadas</CardDescription>
            </CardHeader>
            <CardContent>
              {cards.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Sin tarjetas</p>
              ) : (
                <div className="space-y-2">
                  {cards.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium truncate">{c.code}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <Badge variant="outline" className="text-xs">{c.card_type}</Badge>
                          <Badge variant="outline" className="text-xs">{c.origin}</Badge>
                          {c.is_gift && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Gift className="h-3 w-3" /> Regalo
                            </Badge>
                          )}
                          {c.is_activated && (
                            <Badge variant="default" className="text-xs">Activada</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold">{c.download_credits} créditos</p>
                        <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="downloads" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Últimas descargas</CardTitle>
              <CardDescription>Hasta 50 descargas más recientes</CardDescription>
            </CardHeader>
            <CardContent>
              {downloads.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Sin descargas</p>
              ) : (
                <div className="space-y-1">
                  {downloads.map((d: any) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{d.songs?.title ?? 'Canción eliminada'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {d.songs?.artists?.name ?? '—'}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(d.downloaded_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="favorites" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Canciones favoritas</CardTitle>
            </CardHeader>
            <CardContent>
              {favorites.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Sin favoritos</p>
              ) : (
                <div className="space-y-1">
                  {favorites.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/40">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{f.songs?.title ?? '—'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {f.songs?.artists?.name ?? '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notas internas</CardTitle>
              <CardDescription>Solo visibles para administradores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Escribe una nota interna sobre este usuario..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button onClick={addNote} disabled={savingNote || !newNote.trim()}>
                  {savingNote ? 'Guardando...' : 'Añadir nota'}
                </Button>
              </div>
              <div className="space-y-2">
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Sin notas todavía</p>
                ) : (
                  notes.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-lg border ${
                        n.pinned ? 'border-primary/40 bg-primary/5' : 'border-border/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm whitespace-pre-wrap flex-1">{n.note}</p>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => togglePin(n)}
                          >
                            {n.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => deleteNote(n.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(n.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const MiniStat = ({ icon: Icon, label, value }: { icon: any; label: string; value: any }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
    <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="font-semibold truncate">{value}</p>
    </div>
  </div>
);

export default UserDetail;
