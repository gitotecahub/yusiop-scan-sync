import { useNavigate } from 'react-router-dom';
import { Music, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useModeStore } from '@/stores/modeStore';

/**
 * Botón visible en Perfil para alternar entre modo Usuario y Artista.
 * Solo visible si el usuario tiene el rol artist aprobado.
 */
const ModeSwitcher = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isArtist, mode, setMode } = useModeStore();

  if (!isArtist || !user) return null;

  const switchTo = async (target: 'user' | 'artist') => {
    await setMode(user.id, target);
    navigate(target === 'artist' ? '/artist' : '/');
  };

  return (
    <div className="blob-card p-4">
      <p className="eyebrow mb-3">Modo activo</p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={mode === 'user' ? 'default' : 'outline'}
          onClick={() => switchTo('user')}
          className="rounded-xl"
        >
          <UserIcon className="h-4 w-4 mr-2" /> Usuario
        </Button>
        <Button
          variant={mode === 'artist' ? 'default' : 'outline'}
          onClick={() => switchTo('artist')}
          className="rounded-xl"
        >
          <Music className="h-4 w-4 mr-2" /> Artista
        </Button>
      </div>
    </div>
  );
};

export default ModeSwitcher;
