import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Settings, 
  Download, 
  CreditCard, 
  Wifi, 
  LogOut,
  Edit,
  Camera,
  Upload,
  Moon,
  Sun,
  Monitor,
  Clock,
  Calendar,
  Music,
  CheckCircle2,
  Hourglass,
  ShieldCheck,
  Languages,
  HelpCircle,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useStaffAreas } from '@/hooks/useStaffAreas';
import { useLanguageStore, LANGUAGES } from '@/stores/languageStore';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { useModeStore } from '@/stores/modeStore';
import ModeSwitcher from '@/components/ModeSwitcher';
import SubscriptionLevelBadge from '@/components/SubscriptionLevelBadge';
import RequestAdButton from '@/components/ads/RequestAdButton';

interface ScannedCard {
  id: string;
  card_id: string;
  card_type: string;
  scanned_at: string;
  credits_remaining: number;
  max_credits: number;
  expires_at: string;
  is_active: boolean;
}

const Profile = () => {
  const { user, signOut } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguageStore();
  const currentLang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];
  const navigate = useNavigate();
  const { isArtist, artistRequestStatus } = useModeStore();
  const { areas, isSuperAdmin, loading: staffLoading } = useStaffAreas();
  const hasPanelAccess = !staffLoading && (isSuperAdmin || areas.size > 0);
  const [editing, setEditing] = useState(false);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [scannedCards, setScannedCards] = useState<ScannedCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);

  // Construye el historial unificando user_credits (legacy) + qr_cards (sistema actual)
  const buildScannedCards = (
    credits: any[],
    qrCards: any[],
  ): ScannedCard[] => {
    const fromQr: ScannedCard[] = qrCards.map((c: any) => ({
      id: c.id,
      card_id: c.code ?? c.id,
      card_type: c.card_type ?? 'standard',
      scanned_at: c.activated_at ?? c.created_at,
      credits_remaining: c.download_credits ?? 0,
      max_credits:
        c.card_type === 'premium' ? 12 : c.card_type === 'standard' ? 4 : (c.download_credits ?? 0),
      expires_at: c.activated_at ?? c.created_at,
      is_active: (c.download_credits ?? 0) > 0,
    }));
    const fromLegacy: ScannedCard[] = credits.map((c: any) => ({
      id: c.id,
      card_id: c.card_id,
      card_type: c.card_type,
      scanned_at: c.scanned_at,
      credits_remaining: c.credits_remaining,
      max_credits: c.max_credits,
      expires_at: c.expires_at,
      is_active: !!c.is_active,
    }));
    return [...fromQr, ...fromLegacy].sort(
      (a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime(),
    );
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Perfil del usuario (se carga desde Supabase)
  const [profile, setProfile] = useState({
    username: '',
    fullName: '',
    email: user?.email || '',
    downloadsRemaining: 0,
    totalDownloads: 0,
    activatedCards: 0,
    birthYear: '' as string,
    gender: '' as string,
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url, downloads_remaining, birth_year, gender')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProfile(prev => ({
            ...prev,
            username: data.username || '',
            fullName: data.full_name || '',
            downloadsRemaining: data.downloads_remaining ?? 0,
            birthYear: data.birth_year ? String(data.birth_year) : '',
            gender: data.gender || '',
          }));
          if (data.avatar_url) setAvatarUrl(data.avatar_url);
        } else {
          // Si no existe, crear un perfil básico
          const initial = {
            user_id: user.id,
            username: user.email?.split('@')[0] || 'usuario',
            full_name: (user.user_metadata as any)?.full_name || user.email?.split('@')[0] || 'Usuario',
            downloads_remaining: 0,
          };
          const { error: insertError } = await supabase.from('profiles').insert(initial);
          if (insertError) throw insertError;

          setProfile(prev => ({
            ...prev,
            username: initial.username,
            fullName: initial.full_name,
          }));
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        toast.error(t('state.error'));
      }
    };

    const loadScannedCards = async () => {
      if (!user?.email || !user?.id) return;

      try {
        setLoadingCards(true);

        const [creditsRes, qrCardsRes, downloadsRes] = await Promise.all([
          supabase
            .from('user_credits')
            .select('*')
            .eq('user_email', user.email)
            .order('scanned_at', { ascending: false }),
          supabase
            .from('qr_cards')
            .select('id, code, card_type, download_credits, activated_at, created_at')
            .or(`owner_user_id.eq.${user.id},activated_by.eq.${user.id}`)
            .order('activated_at', { ascending: false }),
          supabase
            .from('user_downloads')
            .select('id', { count: 'exact', head: true })
            .or(`user_id.eq.${user.id},user_email.eq.${user.email}`),
        ]);

        if (creditsRes.error) throw creditsRes.error;
        if (qrCardsRes.error) throw qrCardsRes.error;
        if (downloadsRes.error) throw downloadsRes.error;

        const credits = creditsRes.data ?? [];
        const qrCards = qrCardsRes.data ?? [];

        const legacyAvailable = credits
          .filter((c: any) => c.is_active && c.credits_remaining > 0)
          .reduce((sum: number, c: any) => sum + (c.credits_remaining ?? 0), 0);
        const ownedAvailable = qrCards.reduce(
          (sum: number, c: any) => sum + (c.download_credits ?? 0),
          0,
        );

        setScannedCards(buildScannedCards(credits, qrCards));
        setProfile(prev => ({
          ...prev,
          downloadsRemaining: legacyAvailable + ownedAvailable,
          totalDownloads: downloadsRes.count ?? 0,
          activatedCards: credits.length + qrCards.length,
        }));
      } catch (err) {
        console.error('Error loading scanned cards:', err);
        toast.error(t('state.error'));
      } finally {
        setLoadingCards(false);
      }
    };

    loadProfile();
    loadScannedCards();
  }, [user]);

  // Refrescar contadores reales (disponibles, descargadas, tarjetas) en tiempo real
  const refreshCounters = async () => {
    if (!user?.email || !user?.id) return;
    try {
      const [creditsRes, qrCardsRes, downloadsRes] = await Promise.all([
        supabase
          .from('user_credits')
          .select('*')
          .eq('user_email', user.email)
          .order('scanned_at', { ascending: false }),
        supabase
          .from('qr_cards')
          .select('id, code, card_type, download_credits, activated_at, created_at')
          .or(`owner_user_id.eq.${user.id},activated_by.eq.${user.id}`)
          .order('activated_at', { ascending: false }),
        supabase
          .from('user_downloads')
          .select('id', { count: 'exact', head: true })
          .or(`user_id.eq.${user.id},user_email.eq.${user.email}`),
      ]);

      const credits = creditsRes.data ?? [];
      const qrCards = qrCardsRes.data ?? [];

      const legacyAvailable = credits
        .filter((c: any) => c.is_active && c.credits_remaining > 0)
        .reduce((sum: number, c: any) => sum + (c.credits_remaining ?? 0), 0);
      const ownedAvailable = qrCards.reduce(
        (sum: number, c: any) => sum + (c.download_credits ?? 0),
        0,
      );

      setScannedCards(buildScannedCards(credits, qrCards));
      setProfile(prev => ({
        ...prev,
        downloadsRemaining: legacyAvailable + ownedAvailable,
        totalDownloads: downloadsRes.count ?? 0,
        activatedCards: credits.length + qrCards.length,
      }));
    } catch (err) {
      console.error('Error refreshing counters:', err);
    }
  };

  useEffect(() => {
    if (!user?.email || !user?.id) return;

    const channel = supabase
      .channel('profile-counters-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_credits', filter: `user_email=eq.${user.email}` },
        () => refreshCounters(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'qr_cards', filter: `owner_user_id=eq.${user.id}` },
        () => refreshCounters(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'qr_cards', filter: `activated_by=eq.${user.id}` },
        () => refreshCounters(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_downloads', filter: `user_id=eq.${user.id}` },
        () => refreshCounters(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, user?.id]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      // Verificar si existe el perfil
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const birthYearNum = profile.birthYear ? parseInt(profile.birthYear, 10) : null;
      const genderVal = profile.gender || null;
      const updates = {
        full_name: profile.fullName,
        username: profile.username,
        birth_year: birthYearNum && birthYearNum >= 1900 && birthYearNum <= new Date().getFullYear() ? birthYearNum : null,
        gender: genderVal,
      };

      if (existing) {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profiles')
          .insert({ user_id: user.id, ...updates });
        if (error) throw error;
      }

      setEditing(false);
      toast.success('Perfil actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error(t('state.error'));
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('state.error'));
      return;
    }

    try {
      setUploading(true);
      
      // Crear nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Subir el archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtener la URL pública de la imagen
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);

      // Guardar URL en el perfil
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      toast.success(t('state.success'));

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(t('state.error'));
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success(t('profile.logoutSuccess'));
  };

  const formatDate = (dateString: string) => {
    const localeMap: Record<string, string> = { es: 'es-ES', en: 'en-US', fr: 'fr-FR', pt: 'pt-PT' };
    return new Date(dateString).toLocaleDateString(localeMap[language] ?? 'es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return language === 'en' ? 'Just now' : language === 'fr' ? "À l'instant" : language === 'pt' ? 'Agora' : 'Hace un momento';
    if (diffInMinutes < 60) return language === 'en' ? `${diffInMinutes}m ago` : language === 'fr' ? `Il y a ${diffInMinutes} min` : language === 'pt' ? `Há ${diffInMinutes} min` : `Hace ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return language === 'en' ? `${diffInHours}h ago` : language === 'fr' ? `Il y a ${diffInHours}h` : language === 'pt' ? `Há ${diffInHours}h` : `Hace ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return language === 'en' ? `${diffInDays}d ago` : language === 'fr' ? `Il y a ${diffInDays}j` : language === 'pt' ? `Há ${diffInDays}d` : `Hace ${diffInDays}d`;
    
    return formatDate(dateString);
  };

  const getCardTypeColor = (cardType: string) => {
    switch (cardType.toLowerCase()) {
      case 'premium': return 'sunset-bg';
      case 'standard': return 'aurora-bg';
      case 'basic': return 'bg-muted';
      default: return 'vapor-bg';
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="display-xl text-4xl">
          {t('profile.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          {t('profile.personalInfo')}
        </p>
      </div>

      {/* Profile masthead — blob card */}
      <div className="blob-card p-6">
        <div className="flex items-start gap-5">
          <div className="relative shrink-0">
            <Avatar className="w-20 h-20 rounded-3xl">
              <AvatarImage
                src={avatarUrl || "/placeholder-avatar.png"}
                className="object-cover w-full h-full"
              />
              <AvatarFallback className="text-base rounded-3xl bg-muted font-display font-bold">
                {profile.fullName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <Button
              size="sm"
              className="absolute -bottom-1 -right-1 rounded-full w-8 h-8 p-0 vapor-bg hover:opacity-90 shadow-glow"
              onClick={handleAvatarClick}
              disabled={uploading}
            >
              {uploading ? (
                <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5 text-primary-foreground" />
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="eyebrow mb-1">{t('profile.username')}</p>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold leading-tight truncate">{profile.fullName}</h2>
              <SubscriptionLevelBadge size="md" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">@{profile.username}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(!editing)}
              className="rounded-full h-8 px-3 mt-2 -ml-3 text-xs hover:bg-muted text-primary"
            >
              <Edit className="h-3 w-3 mr-1.5" />
              {t('profile.edit')}
            </Button>
          </div>
        </div>

        {editing && (
          <div className="space-y-4 mt-6 pt-6 border-t border-border">
            <div className="space-y-2">
              <Label className="eyebrow">{t('profile.fullName')}</Label>
              <Input
                value={profile.fullName}
                onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
                className="rounded-2xl border-border bg-input h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="eyebrow">{t('profile.username')}</Label>
              <Input
                value={profile.username}
                onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                className="rounded-2xl border-border bg-input h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="eyebrow">{t('profile.birthYear')}</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="1995"
                  min={1900}
                  max={new Date().getFullYear()}
                  value={profile.birthYear}
                  onChange={(e) => setProfile(prev => ({ ...prev, birthYear: e.target.value }))}
                  className="rounded-2xl border-border bg-input h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="eyebrow">{t('profile.gender')}</Label>
                <Select
                  value={profile.gender || 'unset'}
                  onValueChange={(v) => setProfile(prev => ({ ...prev, gender: v === 'unset' ? '' : v }))}
                >
                  <SelectTrigger className="rounded-2xl border-border bg-input h-11">
                    <SelectValue placeholder={t('action.search')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">{t('profile.preferNotSay')}</SelectItem>
                    <SelectItem value="female">{t('profile.female')}</SelectItem>
                    <SelectItem value="male">{t('profile.male')}</SelectItem>
                    <SelectItem value="non_binary">{t('profile.other')}</SelectItem>
                    <SelectItem value="prefer_not_to_say">{t('profile.preferNotSay')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t('common.optional')}
            </p>
            <Button onClick={handleSaveProfile} className="w-full rounded-full vapor-bg text-primary-foreground hover:opacity-90 h-11 font-bold shadow-glow">
              {t('profile.save')}
            </Button>
          </div>
        )}

        {!editing && (
          <div className="grid grid-cols-3 mt-6 pt-6 border-t border-border">
            <div className="text-center">
              <p className="display-xl text-2xl vapor-text">{String(profile.downloadsRemaining).padStart(2, '0')}</p>
              <p className="eyebrow mt-1.5">{t('profile.remainingDownloads')}</p>
            </div>
            <div className="text-center border-x border-border">
              <p className="display-xl text-2xl">{String(profile.totalDownloads).padStart(2, '0')}</p>
              <p className="eyebrow mt-1.5">{t('profile.totalDownloads')}</p>
            </div>
            <div className="text-center">
              <p className="display-xl text-2xl">{String(profile.activatedCards).padStart(2, '0')}</p>
              <p className="eyebrow mt-1.5">{t('profile.cards')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Modo Usuario / Artista (solo si es artista aprobado) */}
      <ModeSwitcher />

      {/* Acceso al panel de administración (solo si tiene rol o áreas asignadas) */}
      {hasPanelAccess && (
        <div className="blob-card p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl vapor-bg flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="eyebrow mb-1">Yusiop</p>
              <h3 className="font-display text-lg font-bold leading-tight">
                {t('profile.adminPanel')}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isSuperAdmin
                  ? t('admin.panel')
                  : `${areas.size} ${t('common.all')}`}
              </p>
              <Button
                size="sm"
                onClick={() => navigate('/admin')}
                className="mt-3 rounded-full vapor-bg text-primary-foreground h-9 px-4 text-xs font-bold shadow-glow"
              >
                <ShieldCheck className="h-3 w-3 mr-1.5" />
                {t('profile.accessPanel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conviértete en artista (solo si NO es artista) */}
      {!isArtist && (
        <div className="blob-card p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl sunset-bg flex items-center justify-center shrink-0">
              <Music className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="eyebrow mb-1">Yusiop Artist</p>
              <h3 className="font-display text-lg font-bold leading-tight">
                {artistRequestStatus === 'pending'
                  ? t('mode.requestPending')
                  : artistRequestStatus === 'rejected'
                    ? t('mode.requestRejected')
                    : t('mode.becomeArtist')}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {artistRequestStatus === 'pending'
                  ? t('state.loading')
                  : artistRequestStatus === 'rejected'
                    ? t('action.retry')
                    : t('artist.becomeArtistDesc')}
              </p>
              <Button
                size="sm"
                onClick={() => navigate('/artist/request')}
                className="mt-3 rounded-full vapor-bg text-primary-foreground h-9 px-4 text-xs font-bold"
                disabled={artistRequestStatus === 'pending'}
              >
                {artistRequestStatus === 'pending' ? (
                  <><Hourglass className="h-3 w-3 mr-1.5" /> {t('mode.requestPending')}</>
                ) : artistRequestStatus === 'rejected' ? (
                  t('action.retry')
                ) : (
                  t('artist.requestArtist')
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Amigos */}
      <div className="blob-card p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yusiop-primary via-yusiop-accent to-yusiop-secondary flex items-center justify-center shrink-0">
            <Users className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="eyebrow mb-1">Social</p>
            <h3 className="font-display text-lg font-bold leading-tight">
              Amigos
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Conecta con otros usuarios y comparte música y tarjetas.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/friends')}
              className="mt-3 rounded-full h-9 px-4 text-xs font-bold"
            >
              <Users className="h-3 w-3 mr-1.5" />
              Gestionar amigos
            </Button>
          </div>
        </div>
      </div>

      {/* Ayuda y Soporte */}
      <div className="blob-card p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yusiop-primary via-yusiop-accent to-yusiop-secondary flex items-center justify-center shrink-0">
            <HelpCircle className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="eyebrow mb-1">Soporte</p>
            <h3 className="font-display text-lg font-bold leading-tight">
              Ayuda y Soporte
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Resuelve dudas sobre tarjetas, descargas y tu cuenta.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/support')}
              className="mt-3 rounded-full h-9 px-4 text-xs font-bold"
            >
              <HelpCircle className="h-3 w-3 mr-1.5" />
              Abrir centro de ayuda
            </Button>
          </div>
        </div>
      </div>

      {/* Publicidad */}
      <RequestAdButton variant="card" />

      {/* Settings */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <p className="eyebrow">{t('settings.title')}</p>
        </div>
        <div className="border-t border-border">
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Wifi className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <div>
                <p className="font-display font-semibold text-sm">{t('profile.wifiOnly')}</p>
                <p className="text-xs text-muted-foreground">{t('profile.wifiOnlyDesc')}</p>
              </div>
            </div>
            <Switch checked={wifiOnly} onCheckedChange={setWifiOnly} />
          </div>

          <div className="flex items-center justify-between py-4 border-b border-border">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} /> :
               theme === 'light' ? <Sun className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} /> :
               <Monitor className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
              <div>
                <p className="font-display font-semibold text-sm">{t('settings.theme')}</p>
                <p className="text-xs text-muted-foreground">{t('profile.theme.light')} · {t('profile.theme.dark')} · {t('profile.theme.system')}</p>
              </div>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-28 rounded-none border-border bg-transparent h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="h-3.5 w-3.5" /> {t('profile.theme.light')}</div></SelectItem>
                <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="h-3.5 w-3.5" /> {t('profile.theme.dark')}</div></SelectItem>
                <SelectItem value="system"><div className="flex items-center gap-2"><Monitor className="h-3.5 w-3.5" /> {t('profile.theme.system')}</div></SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Languages className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <div>
                <p className="font-display font-semibold text-sm">{t('settings.language')}</p>
                <p className="text-xs text-muted-foreground">{t('settings.languageLabel')}</p>
              </div>
            </div>
            <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
              <SelectTrigger className="w-36 rounded-none border-border bg-transparent h-9">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <span>{currentLang.flag}</span>
                    <span className="text-xs">{currentLang.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Download className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <div>
                <p className="font-display font-semibold text-sm">{t('settings.notifications')}</p>
                <p className="text-xs text-muted-foreground">{t('profile.notifDesc')}</p>
              </div>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <div className="pt-4 border-t border-border">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full rounded-none h-11 text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center gap-2 border border-destructive/30"
        >
          <LogOut className="h-4 w-4" />
          {t('profile.logout')}
        </Button>
      </div>

      {/* Activated Cards History */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <p className="eyebrow">{t('profile.scannedHistory')}</p>
        </div>

        {loadingCards ? (
          <div className="flex items-center justify-center py-10 border border-border">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : scannedCards.length > 0 ? (
          <div className="border-t border-border">
            {scannedCards.map((card) => (
              <div key={card.id} className="py-4 border-b border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`w-1.5 h-1.5 ${card.is_active ? 'bg-primary' : 'bg-muted-foreground'}`} />
                      <p className="font-display font-bold text-sm capitalize">{card.card_type}</p>
                      <Badge variant={card.is_active ? "default" : "secondary"} className="text-[9px] uppercase tracking-wider rounded-none px-1.5 py-0 h-4">
                        {card.is_active ? t('profile.cardActive') : t('profile.cardExpired')}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">{card.card_id}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground/80 mt-2 tracking-wider">
                      <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{formatTimeAgo(card.scanned_at)}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{formatDate(card.expires_at)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-xl font-bold tabular-nums">
                      {card.credits_remaining}<span className="text-muted-foreground text-xs">/{card.max_credits}</span>
                    </p>
                    <p className="eyebrow mt-0.5">{t('profile.creditsLeft')}</p>
                    <div className="w-16 h-0.5 bg-muted mt-2 ml-auto overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${(card.credits_remaining / card.max_credits) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border border-border">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" strokeWidth={1.2} />
            <p className="text-sm text-muted-foreground">{t('profile.noScannedCards')}</p>
          </div>
        )}

        <p className="eyebrow text-center mt-8">© Yusiop · MMXXVI</p>
      </div>
    </div>
  );
};

export default Profile;