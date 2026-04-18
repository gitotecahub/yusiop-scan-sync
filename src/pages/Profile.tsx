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
  Calendar
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';

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
  const [editing, setEditing] = useState(false);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [scannedCards, setScannedCards] = useState<ScannedCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Perfil del usuario (se carga desde Supabase)
  const [profile, setProfile] = useState({
    username: '',
    fullName: '',
    email: user?.email || '',
    downloadsRemaining: 0,
    totalDownloads: 0,
    activatedCards: 0
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url, downloads_remaining')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProfile(prev => ({
            ...prev,
            username: data.username || '',
            fullName: data.full_name || '',
            downloadsRemaining: data.downloads_remaining ?? 0,
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
        toast.error('No se pudo cargar el perfil');
      }
    };

    const loadScannedCards = async () => {
      if (!user?.email) return;
      
      try {
        setLoadingCards(true);
        const { data, error } = await supabase
          .from('user_credits')
          .select('*')
          .eq('user_email', user.email)
          .order('scanned_at', { ascending: false });

        if (error) throw error;

        setScannedCards(data || []);
        setProfile(prev => ({
          ...prev,
          activatedCards: data?.length || 0
        }));
      } catch (err) {
        console.error('Error loading scanned cards:', err);
        toast.error('No se pudo cargar el historial de tarjetas');
      } finally {
        setLoadingCards(false);
      }
    };

    loadProfile();
    loadScannedCards();
  }, [user]);

  // Configurar actualizaciones en tiempo real para tarjetas escaneadas
  useEffect(() => {
    if (!user?.email) return;

    const channel = supabase
      .channel('user-credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits',
          filter: `user_email=eq.${user.email}`
        },
        (payload) => {
          console.log('Real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setScannedCards(prev => [payload.new as ScannedCard, ...prev]);
            setProfile(prev => ({
              ...prev,
              activatedCards: prev.activatedCards + 1
            }));
            toast.success('Nueva tarjeta escaneada detectada');
          } else if (payload.eventType === 'UPDATE') {
            setScannedCards(prev =>
              prev.map(card =>
                card.id === payload.new.id ? payload.new as ScannedCard : card
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setScannedCards(prev => prev.filter(card => card.id !== payload.old.id));
            setProfile(prev => ({
              ...prev,
              activatedCards: Math.max(0, prev.activatedCards - 1)
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      // Verificar si existe el perfil
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: profile.fullName, username: profile.username })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            full_name: profile.fullName,
            username: profile.username,
          });
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
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
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

      toast.success('Foto de perfil actualizada correctamente');

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Sesión cerrada');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
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
    
    if (diffInMinutes < 1) return 'Hace un momento';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays}d`;
    
    return formatDate(dateString);
  };

  const getCardTypeColor = (cardType: string) => {
    switch (cardType.toLowerCase()) {
      case 'premium': return 'bg-gradient-to-r from-amber-500 to-orange-500';
      case 'standard': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case 'basic': return 'bg-gradient-to-r from-gray-500 to-slate-500';
      default: return 'bg-gradient-to-r from-primary to-primary/80';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Tu cuenta</p>
        <h1 className="font-display text-3xl font-bold">Perfil</h1>
        <p className="text-sm text-muted-foreground">Gestiona tu cuenta y configuración</p>
      </div>

      {/* Profile Info */}
      <Card className="yusiop-card">
        <CardHeader className="text-center">
          <div className="relative mx-auto mb-4">
            <Avatar className="w-24 h-24">
              <AvatarImage 
                src={avatarUrl || "/placeholder-avatar.png"} 
                className="object-cover w-full h-full"
              />
              <AvatarFallback className="text-lg">
                {profile.fullName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <Button
              size="sm"
              className="absolute -bottom-1 -right-1 rounded-full w-8 h-8 p-0 bg-primary hover:bg-primary/90"
              onClick={handleAvatarClick}
              disabled={uploading}
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="h-4 w-4 text-white" />
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
          <CardTitle className="flex items-center justify-center gap-2">
            {profile.fullName}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(!editing)}
              className="yusiop-button-ghost"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>@{profile.username}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre completo</Label>
                <Input
                  value={profile.fullName}
                  onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
                  className="yusiop-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre de usuario</Label>
                <Input
                  value={profile.username}
                  onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                  className="yusiop-input"
                />
              </div>
              <Button onClick={handleSaveProfile} className="w-full yusiop-button-primary">
                Guardar Cambios
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{profile.downloadsRemaining}</p>
                <p className="text-xs text-muted-foreground">Disponibles</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{profile.totalDownloads}</p>
                <p className="text-xs text-muted-foreground">Descargadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">{profile.activatedCards}</p>
                <p className="text-xs text-muted-foreground">Tarjetas</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="yusiop-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                <Label>Descargas solo con Wi-Fi</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Evita usar datos móviles
              </p>
            </div>
            <Switch
              checked={wifiOnly}
              onCheckedChange={setWifiOnly}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4" />
                ) : theme === 'light' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
                <Label>Tema de la aplicación</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Cambia entre modo claro, oscuro o automático
              </p>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Tema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Claro
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Oscuro
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Sistema
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <Label>Notificaciones de descarga</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Recibir notificaciones al completar descargas
              </p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Activated Cards History */}
      <Card className="yusiop-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Historial de Tarjetas
          </CardTitle>
          <CardDescription>
            Tarjetas QR que has activado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCards ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : scannedCards.length > 0 ? (
            <div className="space-y-4">
              {scannedCards.map((card) => (
                <div key={card.id} className="relative overflow-hidden rounded-lg border border-border hover:shadow-md transition-shadow">
                  <div className={`absolute top-0 left-0 w-1 h-full ${getCardTypeColor(card.card_type)}`} />
                  <div className="p-4 pl-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">Tarjeta {card.card_type}</h4>
                          <Badge 
                            variant={card.is_active ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {card.is_active ? "Activa" : "Expirada"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ID: {card.card_id}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(card.scanned_at)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expira: {formatDate(card.expires_at)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-medium text-lg">
                          {card.credits_remaining}/{card.max_credits}
                        </p>
                        <p className="text-xs text-muted-foreground">créditos</p>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getCardTypeColor(card.card_type)} transition-all`}
                            style={{ 
                              width: `${(card.credits_remaining / card.max_credits) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-2">No has escaneado ninguna tarjeta aún</p>
              <p className="text-sm text-muted-foreground">
                Usa el escáner QR para activar tus primeras tarjetas
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card className="yusiop-card border-destructive/20">
        <CardContent className="p-6">
          <Button
            onClick={handleSignOut}
            variant="destructive"
            className="w-full flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;