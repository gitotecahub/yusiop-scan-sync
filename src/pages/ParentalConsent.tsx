/**
 * Public page that the guardian visits after clicking the email link.
 * Calls the SECURITY DEFINER RPC `consume_parental_token` to mark the
 * child's profile as parental_verified.
 */
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

type State = 'idle' | 'loading' | 'success' | 'error';

const ParentalConsent = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const confirm = async () => {
    if (!token) return;
    setState('loading');
    setErrorMsg(null);
    const { data, error } = await supabase.rpc('consume_parental_token', { p_token: token });
    if (error || !(data as any)?.success) {
      setErrorMsg((data as any)?.error || error?.message || 'No se pudo validar el enlace.');
      setState('error');
      return;
    }
    setState('success');
  };

  useEffect(() => {
    if (!token) setState('error');
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Autorización parental · YUSIOP</CardTitle>
          <CardDescription>
            Confirma que autorizas a tu hijo/a a usar la aplicación YUSIOP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token && (
            <p className="text-sm text-destructive text-center">
              Enlace inválido o caducado.
            </p>
          )}

          {state === 'idle' && token && (
            <Button onClick={confirm} className="w-full">
              Autorizar uso de la app
            </Button>
          )}

          {state === 'loading' && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {state === 'success' && (
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <p className="text-sm font-medium">Autorización confirmada</p>
              <p className="text-xs text-muted-foreground">
                Tu hijo/a ya puede acceder a YUSIOP con normalidad.
              </p>
              <Button asChild variant="ghost" size="sm">
                <Link to="/">Volver al inicio</Link>
              </Button>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center space-y-3">
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-sm font-medium">No se pudo validar</p>
              <p className="text-xs text-muted-foreground">{errorMsg || 'El enlace ya fue usado o ha caducado.'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentalConsent;
