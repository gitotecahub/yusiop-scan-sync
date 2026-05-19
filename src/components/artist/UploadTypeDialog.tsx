import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Music, Disc3 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (type: 'single' | 'album') => void;
}

const UploadTypeDialog = ({ open, onOpenChange, onChoose }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Qué quieres subir?</DialogTitle>
          <DialogDescription>
            Elige el tipo de lanzamiento. Podrás añadir colaboradores, portada y metadatos en el siguiente paso.
          </DialogDescription>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => onChoose('single')}
            className="group rounded-xl border border-border bg-card p-5 text-left hover:border-primary hover:shadow-glow transition-all"
          >
            <Music className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-display font-bold text-lg">Single</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Una sola canción. Subida rápida con todos los metadatos en un único paso.
            </p>
          </button>
          <button
            type="button"
            onClick={() => onChoose('album')}
            className="group rounded-xl border border-border bg-card p-5 text-left hover:border-primary hover:shadow-glow transition-all"
          >
            <Disc3 className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-display font-bold text-lg">Álbum</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Varias pistas agrupadas bajo una portada común. Mínimo 2 pistas.
            </p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadTypeDialog;
