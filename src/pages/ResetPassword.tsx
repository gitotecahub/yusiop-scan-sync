import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordField } from '@/components/auth/PasswordField';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';

type Status = 'validating' | 'ready' | 'invalid';

const parseHash = (hash: string) => {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  return new URLSearchParams(h);
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>('validating');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    // 1) Comprobar errores en el hash (token caducado / inválido)
    const hashParams = parseHash(window.location.hash);
    const queryParams = new URLSearchParams(window.location.search);
    const errorCode =
      hashParams.get('error_code') || queryParams.get('error_code');
    const errorDescription =
      hashParams.get('error_description') || queryParams.get('error_description');

    if (errorCode) {
      setStatus('invalid');
      if (errorCode === 'otp_expired') {
        setErrorMsg('El enlace ha caducado. Solicita uno nuevo abajo.');
      } else {
        setErrorMsg(
          errorDescription?.replace(/\+/g, ' ') ||
            'Este enlace ya no es válido. Solicita uno nuevo.',
        );
      }
      return;
    }

    // 2) Escuchar el evento PASSWORD_RECOVERY que dispara Supabase tras parsear el hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setStatus('ready');
        }
      },
    );

    // 3) Validar si ya hay sesión de recuperación o token en el hash
    const hasRecoveryToken =
      hashParams.get('type') === 'recovery' && !!hashParams.get('access_token');

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session || hasRecoveryToken) {
        setStatus('ready');
      } else {
        // Pequeño delay para dar tiempo a detectSessionInUrl
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s2 } }) => {
            if (s2) setStatus('ready');
            else {
              setStatus('invalid');
              setErrorMsg(
                'No se ha detectado un enlace de recuperación válido. Solicita uno nuevo.',
              );
            }
          });
        }, 800);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (error) {
      const msg = error.message || '';
      if (/expired|invalid|grant/i.test(msg)) {
        setStatus('invalid');
        setErrorMsg('El enlace ha caducado. Solicita uno nuevo.');
      } else {
        toast.error(`Error: ${msg}`);
      }
      return;
    }
    toast.success('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="dark relative min-h-screen w-full flex items-center justify-center p-5 overflow-hidden grain">
      <div className="fixed inset-0 z-0" style={{ background: 'var(--gradient-vapor)' }} />
      <div className="fixed inset-0 z-0 bg-background/40 backdrop-blur-2xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="display-xl text-6xl mb-2">
            <span className="vapor-text">Y</span>USIOP
          </h1>
          <p className="eyebrow mt-3">Restablecer contraseña</p>
        </div>

        <div className="glass-strong shadow-vapor p-7">
          {status === 'invalid' ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button
                onClick={() => setForgotOpen(true)}
                className="w-full h-12 rounded-full vapor-bg text-primary-foreground font-bold shadow-glow"
              >
                Solicitar nuevo enlace
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/auth')}
                className="w-full h-10 rounded-full"
              >
                Volver al inicio de sesión
              </Button>
            </div>
          ) : status === 'validating' ? (
            <p className="text-sm text-muted-foreground text-center">Validando enlace…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="eyebrow">Nueva contraseña</Label>
                <PasswordField
                  id="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  showStrength
                  className="rounded-2xl border-border bg-input h-12"
                />
                <p className="text-[11px] text-muted-foreground">Mínimo 8 caracteres.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password" className="eyebrow">Confirmar contraseña</Label>
                <PasswordField
                  id="confirm-new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="rounded-2xl border-border bg-input h-12"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 rounded-full vapor-bg text-primary-foreground hover:opacity-90 font-bold shadow-glow"
                disabled={submitting}
              >
                {submitting ? 'Guardando…' : 'Guardar nueva contraseña'}
              </Button>
            </form>
          )}
        </div>
      </div>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  );
};

export default ResetPassword;
