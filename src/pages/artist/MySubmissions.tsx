import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Clock, CheckCircle2, XCircle, Pencil, AlertTriangle, Ban, CalendarClock, Zap, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import SubmitSongDialog, { type EditingSubmission } from '@/components/artist/SubmitSongDialog';
import { parseRejectionReason } from '@/lib/parseRejectionReason';
import { formatMadrid, timeUntil } from '@/lib/madridTime';
import CopyrightBadge, { type CopyrightStatus } from '@/components/copyright/CopyrightBadge';
import CopyrightDetails, { type CopyrightMatch } from '@/components/copyright/CopyrightDetails';
import { useLanguageStore } from '@/stores/languageStore';

interface SubmissionRow {
  id: string;
  title: string;
  artist_name: string;
  album_title: string | null;
  genre: string | null;
  release_date: string | null;
  status: 'pending' | 'pending_payment' | 'approved' | 'rejected' | 'removed';
  rejection_reason: string | null;
  cover_url: string | null;
  cover_path: string | null;
  preview_url: string | null;
  preview_path: string | null;
  track_url: string;
  track_path: string | null;
  duration_seconds: number;
  scheduled_release_at: string | null;
  created_at: string;
  reviewed_at: string | null;
  copyright_status: CopyrightStatus;
  copyright_score: number;
  copyright_matches: CopyrightMatch[] | null;
  express_tier: '72h' | '48h' | '24h' | null;
  express_price_xaf: number | null;
}

const MySubmissions = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t, language } = useLanguageStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [defaultName, setDefaultName] = useState('');
  const [editing, setEditing] = useState<EditingSubmission | null>(null);

  const dateLocale = language === 'es' ? 'es-ES' : language === 'fr' ? 'fr-FR' : language === 'pt' ? 'pt-PT' : 'en-US';

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('song_submissions')
      .select('id,title,artist_name,album_title,genre,release_date,status,rejection_reason,cover_url,cover_path,preview_url,preview_path,track_url,track_path,duration_seconds,scheduled_release_at,created_at,reviewed_at,copyright_status,copyright_score,copyright_matches,express_tier,express_price_xaf')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRows((data ?? []) as unknown as SubmissionRow[]);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('artist_requests')
        .select('artist_name')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.artist_name) setDefaultName(data.artist_name);
    };
    init();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Realtime: refrescar la lista cuando cambien mis envíos (aprobaciones/rechazos)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`my-submissions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'song_submissions',
          filter: `user_id=eq.${user.id}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Deep link: si llega ?edit=<submission_id> abrir el editor cuando carguen las filas
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId || rows.length === 0) return;
    const target = rows.find((r) => r.id === editId);
    if (target) {
      handleEdit(target);
      // limpiar para no reabrir al volver
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, searchParams]);

  const handleEdit = (r: SubmissionRow) => {
    setEditing({
      id: r.id,
      title: r.title,
      artist_name: r.artist_name,
      album_title: r.album_title,
      genre: r.genre,
      release_date: r.release_date,
      track_url: r.track_url,
      track_path: r.track_path,
      preview_url: r.preview_url,
      preview_path: r.preview_path,
      cover_url: r.cover_url,
      cover_path: r.cover_path,
      duration_seconds: r.duration_seconds,
      express_tier: r.express_tier,
      express_price_xaf: r.express_price_xaf,
    });
    setOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setOpen(true);
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/artist')} className="-ml-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('artist.panelLabel')}
        </Button>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" /> {t('artist.uploadMusic')}
        </Button>
      </div>

      <div className="blob-card p-6 mb-6">
        <p className="eyebrow mb-1">{t('artist.subsEyebrow')}</p>
        <h1 className="display-xl text-3xl">{t('artist.subsTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {t('artist.subsSubtitle')}
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t('artist.loading')}</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t('artist.noSongsSent')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <Card key={r.id} className={
              r.status === 'rejected' || r.status === 'removed'
                ? 'border-destructive/40'
                : ''
            }>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-md bg-muted overflow-hidden flex-shrink-0">
                    {r.cover_url ? (
                      <img src={r.cover_url} alt={r.title} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{r.title}</h3>
                      {r.status === 'pending' && (
                        r.express_tier ? (
                          <Badge className="bg-gradient-to-r from-[hsl(220,90%,55%)] via-[hsl(265,85%,60%)] to-[hsl(180,80%,50%)] text-white border-0 shadow-[0_0_12px_hsl(265_85%_60%/0.55)]">
                            <Zap className="h-3 w-3 mr-1" />
                            En revisión prioritaria · {r.express_tier}
                          </Badge>
                        ) : (
                          <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{t('artist.inReviewBadge')}</Badge>
                        )
                      )}
                      {r.status === 'approved' && (
                        r.scheduled_release_at ? (
                          <Badge variant="secondary" className="border border-primary/30">
                            <CalendarClock className="h-3 w-3 mr-1" />{t('artist.scheduledBadge')}
                          </Badge>
                        ) : (
                          <Badge className="bg-primary hover:bg-primary"><CheckCircle2 className="h-3 w-3 mr-1" />{t('artist.publishedBadge')}</Badge>
                        )
                      )}
                      {r.status === 'rejected' && (
                        <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{t('artist.rejectedBadge')}</Badge>
                      )}
                      {r.status === 'removed' && (
                        <Badge variant="outline" className="border-destructive/50 text-destructive">
                          <Ban className="h-3 w-3 mr-1" />{t('artist.removedBadge')}
                        </Badge>
                      )}
                      <CopyrightBadge status={r.copyright_status} score={r.copyright_score} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.artist_name}
                      {r.album_title ? ` · ${r.album_title}` : ''}
                      {r.genre ? ` · ${r.genre}` : ''}
                      {' · '}
                      {new Date(r.created_at).toLocaleString(dateLocale)}
                    </p>
                  </div>
                  {r.status === 'rejected' && (
                    <Button size="sm" onClick={() => handleEdit(r)} className="flex-shrink-0">
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> {t('artist.editAndResend')}
                    </Button>
                  )}
                </div>

                {r.status === 'rejected' && r.rejection_reason && (() => {
                  const items = parseRejectionReason(r.rejection_reason);
                  return (
                    <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div className="text-sm flex-1">
                          <p className="font-semibold text-destructive">
                            {t('artist.rejectionReasonsTitle')}
                          </p>
                          <ul className="list-disc pl-5 mt-1.5 space-y-1 text-foreground/80 marker:text-destructive">
                            {(items.length > 0 ? items : [r.rejection_reason!]).map((it, i) => (
                              <li key={i}>{it}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {r.status === 'removed' && (
                  <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <div className="flex items-start gap-2">
                      <Ban className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="text-sm flex-1">
                        <p className="font-semibold text-destructive">
                          {t('artist.removedTitle')}
                        </p>
                        <p className="text-foreground/80 mt-1">
                          {t('artist.removedDesc')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {r.status === 'approved' && r.scheduled_release_at && (
                  <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-start gap-2">
                      <CalendarClock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="text-sm flex-1">
                        <p className="font-semibold text-primary">
                          {t('artist.scheduledTitle')}
                        </p>
                        <p className="text-foreground/80 mt-1">
                          "{r.title}" {t('artist.scheduledDesc')}{' '}
                          <strong>{formatMadrid(r.scheduled_release_at)}</strong> (Europa/Madrid)
                          {' · '}
                          <span className="text-muted-foreground">{timeUntil(r.scheduled_release_at)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <CopyrightDetails
                  status={r.copyright_status}
                  score={r.copyright_score}
                  matches={r.copyright_matches}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SubmitSongDialog
        open={open}
        onOpenChange={setOpen}
        defaultArtistName={defaultName}
        onSubmitted={load}
        editing={editing}
      />
    </div>
  );
};

export default MySubmissions;
