import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordField } from '@/components/auth/PasswordField';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    // Supabase coloca los tokens en el hash (#access_token=...&type=recovery)
    // y dispara automáticamente PASSWORD_RECOVERY al inicializar el cliente.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });

    // Comprobar si ya hay sesión de recuperación activa
    const hash = window.location.hash || '';
    const isRecovery = hash.includes('type=recovery');
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && (isRecovery || ready)) {
        setReady(true);
      } else if (!isRecovery && !session) {
        setInvalid(true);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast.error(`Error: ${error.message}`);
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
          {invalid ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Este enlace ya no es válido o ha expirado. Solicita un nuevo correo de recuperación.
              </p>
              <Button
                onClick={() => navigate('/auth')}
                className="w-full h-12 rounded-full vapor-bg text-primary-foreground font-bold shadow-glow"
              >
                Volver al inicio de sesión
              </Button>
            </div>
          ) : !ready ? (
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
    </div>
  );
};

export default ResetPassword;
