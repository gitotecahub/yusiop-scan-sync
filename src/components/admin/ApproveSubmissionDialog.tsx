import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, Zap } from 'lucide-react';
import { madridLocalToUtcIso, formatMadrid } from '@/lib/madridTime';
import CopyrightDetails, { type CopyrightMatch } from '@/components/copyright/CopyrightDetails';
import type { CopyrightStatus } from '@/components/copyright/CopyrightBadge';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** YYYY-MM-DD que indicó el artista, opcional */
  defaultReleaseDate: string | null;
  songTitle: string;
  /** Llamado con `null` para publicar ya o ISO UTC para programar */
  onConfirm: (releaseAtIso: string | null) => Promise<void> | void;
  /** Estado del análisis de copyright para mostrar advertencia */
  copyrightStatus?: CopyrightStatus;
  copyrightScore?: number;
  copyrightMatches?: CopyrightMatch[] | null;
}

const todayYmd = () => {
  // Día actual en Madrid en formato YYYY-MM-DD
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  return parts; // en-CA da YYYY-MM-DD
};

const ApproveSubmissionDialog = ({
  open,
  onOpenChange,
  defaultReleaseDate,
  songTitle,
  onConfirm,
  copyrightStatus,
  copyrightScore,
  copyrightMatches,
}: Props) => {
  const [mode, setMode] = useState<'now' | 'scheduled'>('now');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('00:00');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Reset al abrir: si la fecha del artista es futura, prellenar y proponer programar
    const today = todayYmd();
    const proposedDate = defaultReleaseDate && defaultReleaseDate >= today
      ? defaultReleaseDate
      : today;
    setDate(proposedDate);
    setTime('00:00');
    setMode(defaultReleaseDate && defaultReleaseDate > today ? 'scheduled' : 'now');
    setSubmitting(false);
  }, [open, defaultReleaseDate]);

  const previewIso = (() => {
    if (mode !== 'scheduled' || !date) return null;
    try { return madridLocalToUtcIso(date, time); } catch { return null; }
  })();

  const isPastSchedule = previewIso ? new Date(previewIso).getTime() <= Date.now() : false;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(mode === 'now' ? null : previewIso);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprobar envío</DialogTitle>
          <DialogDescription>
            Vas a aprobar <strong>"{songTitle}"</strong>. Elige cómo publicarla.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'now' | 'scheduled')} className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/40">
            <RadioGroupItem value="now" id="mode-now" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Zap className="h-4 w-4 text-primary" /> Publicar ahora
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                La canción aparecerá inmediatamente en el catálogo.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/40">
            <RadioGroupItem value="scheduled" id="mode-scheduled" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Calendar className="h-4 w-4 text-primary" /> Programar lanzamiento
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Se publicará automáticamente a la hora indicada
                {defaultReleaseDate && (
                  <> · Fecha sugerida por el artista: <strong>{defaultReleaseDate}</strong></>
                )}
              </p>

              {mode === 'scheduled' && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="rel-date" className="text-xs">Fecha</Label>
                    <Input
                      id="rel-date"
                      type="date"
                      value={date}
                      min={todayYmd()}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rel-time" className="text-xs">Hora (Madrid)</Label>
                    <Input
                      id="rel-time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                  {previewIso && (
                    <p className={`col-span-2 text-xs ${isPastSchedule ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {isPastSchedule
                        ? '⚠ La fecha y hora ya han pasado. Se publicará al instante.'
                        : `Se publicará el ${formatMadrid(previewIso)} (Europa/Madrid)`}
                    </p>
                  )}
                </div>
              )}
            </div>
          </label>
        </RadioGroup>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || (mode === 'scheduled' && !date)}>
            {submitting ? 'Aprobando…' : mode === 'now' ? 'Publicar ahora' : 'Programar y aprobar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApproveSubmissionDialog;
