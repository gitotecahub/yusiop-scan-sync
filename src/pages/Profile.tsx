import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Monitor
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';

const Profile = () => {
  const { user, signOut } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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

    loadProfile();
  }, [user]);

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

  const activatedCardsHistory = [
    {
      id: '1',
      type: 'Premium',
      activatedAt: '2024-01-15T10:30:00Z',
      downloads: 10,
      used: 10
    },
    {
      id: '2',
      type: 'Estándar',
      activatedAt: '2024-01-10T15:45:00Z',
      downloads: 5,
      used: 5
    }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Perfil</h1>
        <p className="text-muted-foreground">
          Gestiona tu cuenta y configuración
        </p>
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
          {activatedCardsHistory.length > 0 ? (
            <div className="space-y-4">
              {activatedCardsHistory.map((card) => (
                <div key={card.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">Tarjeta {card.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(card.activatedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{card.used}/{card.downloads}</p>
                    <p className="text-sm text-muted-foreground">descargas</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No has activado ninguna tarjeta aún
            </p>
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