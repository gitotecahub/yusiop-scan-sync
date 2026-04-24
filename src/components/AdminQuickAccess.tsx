import { UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const AdminQuickAccess = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!isAdmin) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label="Panel de administración"
            onClick={() => navigate('/admin')}
            className="relative h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors group"
          >
            <UserCog className="h-5 w-5 text-foreground group-hover:text-primary transition-colors" />
            <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full vapor-bg shadow-glow" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Panel de administración
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AdminQuickAccess;
