import { useNavigate } from 'react-router-dom';
import { Music, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useModeStore } from '@/stores/modeStore';
import yusiopLogo from '@/assets/yusiop-logo.png';
import { toast } from 'sonner';

const ProfileSelection = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { markChoiceMade } = useModeStore();

  const handleChooseUser = async () => {
    if (!user) return;
    await markChoiceMade(user.id, 'user');
    toast.success('¡Bienvenido a Yusiop!');
    navigate('/', { replace: true });
  };

  const handleRequestArtist = async () => {
    if (!user) return;
    // Marcamos elección como hecha en modo user, pero los enviamos al formulario
    await markChoiceMade(user.id, 'user');
    navigate('/artist/request', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background overflow-hidden grain relative">
      <div
        className="vapor-orb animate-blob-float"
        style={{ width: 320, height: 320, top: '-80px', right: '-100px', background: 'var(--gradient-vapor)' }}
      />
      <div
        className="vapor-orb animate-blob-float"
        style={{ width: 280, height: 280, bottom: '15%', left: '-120px', background: 'var(--gradient-sunset)', animationDelay: '4s' }}
      />

      <img src={yusiopLogo} alt="Yusiop" className="relative z-10 w-40 mb-10 animate-fade-in" />

      <div className="relative z-10 w-full max-w-md space-y-4 text-center">
        <h1 className="display-xl text-3xl">Elige tu perfil</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Puedes cambiarlo después desde tu perfil.
        </p>

        <button
          onClick={handleChooseUser}
          className="blob-card w-full p-6 text-left hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl vapor-bg flex items-center justify-center shrink-0">
              <UserIcon className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="eyebrow mb-1">Continuar como</p>
              <h3 className="font-display text-xl font-bold">Usuario</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Escucha, descarga y comparte música.
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={handleRequestArtist}
          className="blob-card w-full p-6 text-left hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl sunset-bg flex items-center justify-center shrink-0">
              <Music className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="eyebrow mb-1">Solicitar perfil de</p>
              <h3 className="font-display text-xl font-bold">Artista</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Publica tu música. Requiere aprobación.
              </p>
            </div>
          </div>
        </button>

        <Button
          variant="ghost"
          className="text-xs text-muted-foreground mt-4"
          onClick={handleChooseUser}
        >
          Decidir más tarde
        </Button>
      </div>
    </div>
  );
};

export default ProfileSelection;
