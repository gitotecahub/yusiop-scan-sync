/**
 * Modal bloqueante que pide la fecha de nacimiento a usuarios existentes
 * cuando intentan usar una función sensible (retiros, modo artista, compras…).
 *
 * No bloquea la app entera: se monta puntualmente desde la feature que lo necesite.
 */
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAgeProfile } from '@/hooks/useAgeProfile';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: () => void;
  reason?: string;
}

const computeAgeGroup = (iso: string): 'child' | 'teen' | 'adult' | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  if (age < 0 || age > 120) return null;
  if (age < 14) return 'child';
  if (age < 18) return 'teen';
  return 'adult';
};

const BirthDateGate = ({ open, onOpenChange, onSaved, reason }: Props) => {
  const { user } = useAuthStore();
  const { reload } = useAgeProfile();
  const [birthDate, setBirthDate] = useState('');
  const [parentalEmail, setParentalEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const group = useMemo(() => computeAgeGroup(birthDate), [birthDate]);
  const needsParent = group === 'child';
  const canSave = !!group && (!needsParent || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(parentalEmail));

  const handleSave = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    const token = needsParent ? crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '') : null;
    const { error } = await supabase
      .from('profiles')
      .update({
        birth_date: birthDate,
        parental_email: needsParent ? parentalEmail.trim() : null,
        parental_verification_token: token,
      })
      .eq('user_id', user.id);
    setSaving(false);
    if (error) {
      toast.error('No se pudo guardar la fecha: ' + error.message);
      return;
    }
    await reload();
    if (needsParent) {
      const link = `${window.location.origin}/parental-consent?token=${token}`;
      toast.success('Datos guardados. Comparte el enlace con tu tutor.');
      // Copy guardian link to clipboard so user can email it easily
      try { await navigator.clipboard.writeText(link); } catch { /* noop */ }
    } else {
      toast.success('Fecha guardada');
    }
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Verifica tu edad
          </DialogTitle>
          <DialogDescription>
            {reason
              ? `Para continuar con ${reason}, necesitamos tu fecha de nacimiento.`
              : 'Para usar esta función necesitamos tu fecha de nacimiento. Solo te la pediremos una vez.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="bd-input">Fecha de nacimiento</Label>
            <Input
              id="bd-input"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
            {group && (
              <p className="text-xs text-muted-foreground mt-1">
                Detectado: <strong>{group === 'adult' ? 'Adulto' : group === 'teen' ? 'Adolescente (14-17)' : 'Menor de 14'}</strong>
              </p>
            )}
          </div>

          {needsParent && (
            <>
              <Alert>
                <AlertDescription className="text-xs">
                  Como eres menor de 14 años necesitas la autorización de un tutor.
                  Introduce su email para enviarle el enlace de validación (también lo copiaremos
                  al portapapeles para que puedas compartirlo manualmente).
                </AlertDescription>
              </Alert>
              <div>
                <Label htmlFor="pe-input">Email del tutor</Label>
                <Input
                  id="pe-input"
                  type="email"
                  placeholder="tutor@ejemplo.com"
                  value={parentalEmail}
                  onChange={(e) => setParentalEmail(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BirthDateGate;
