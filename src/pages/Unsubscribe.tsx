import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

type Status = 'loading' | 'valid' | 'already' | 'invalid' | 'submitting' | 'success' | 'error';

const SUPABASE_URL = 'https://wbzwdihdayasmikmqvgp.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setStatus('invalid');
        return;
      }
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus('invalid');
          return;
        }
        if (data.valid === true) setStatus('valid');
        else if (data.reason === 'already_unsubscribed') setStatus('already');
        else setStatus('invalid');
      } catch (e) {
        setStatus('invalid');
      }
    };
    validate();
  }, [token]);

  const handleConfirm = async () => {
    setStatus('submitting');
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) {
        setErrorMessage(error.message);
        setStatus('error');
        return;
      }
      if (data?.success) setStatus('success');
      else if (data?.reason === 'already_unsubscribed') setStatus('already');
      else setStatus('error');
    } catch (e: any) {
      setErrorMessage(e?.message ?? 'Error inesperado');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Cancelar suscripción</CardTitle>
          <CardDescription>
            Gestiona tus preferencias de email de Yusiop.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando enlace...
            </div>
          )}

          {status === 'valid' && (
            <>
              <p className="text-sm text-muted-foreground">
                Pulsa el botón para dejar de recibir emails de notificaciones de Yusiop.
              </p>
              <Button onClick={handleConfirm} className="w-full">
                Confirmar cancelación
              </Button>
            </>
          )}

          {status === 'submitting' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando...
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Te has dado de baja correctamente.
            </div>
          )}

          {status === 'already' && (
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Ya estabas dado de baja.
            </div>
          )}

          {status === 'invalid' && (
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Enlace inválido o caducado.
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                No se pudo completar la baja.
              </div>
              {errorMessage && (
                <p className="text-xs text-muted-foreground">{errorMessage}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
