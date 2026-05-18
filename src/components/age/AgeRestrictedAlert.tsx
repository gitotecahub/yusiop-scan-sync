import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface Props {
  feature?: string;
  reason?: 'adult_only' | 'guardian_required';
}

const AgeRestrictedAlert = ({ feature = 'esta función', reason = 'adult_only' }: Props) => {
  const title = reason === 'guardian_required'
    ? 'Tutor pendiente de verificación'
    : 'Función restringida por edad';
  const description = reason === 'guardian_required'
    ? `Para usar ${feature} necesitas que tu tutor confirme tu cuenta desde el enlace que le enviamos. También puedes reenviarlo desde tu perfil.`
    : `${feature} está disponible solo para usuarios mayores de 18 años, o menores con tutor verificado.`;
  return (
    <Alert className="border-amber-500/40 bg-amber-500/5">
      <ShieldAlert className="h-4 w-4 text-amber-500" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
};

export default AgeRestrictedAlert;
