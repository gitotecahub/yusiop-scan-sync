import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}

export const ForgotPasswordDialog = ({ open, onOpenChange, defaultEmail = '' }: Props) => {
  const { resetPassword } = useAuthStore();
  const [email, setEmail] = useState(defaultEmail);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      toast.error('Introduce un email válido');
      return;
    }
    setSubmitting(true);
    const { error } = await resetPassword(trimmed);
    setSubmitting(false);
    if (error) {
      toast.error(`Error: ${error.message}`);
      return;
    }
    toast.success('Si la cuenta existe, recibirás un correo con instrucciones.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recuperar contraseña</DialogTitle>
          <DialogDescription>
            Te enviaremos un enlace a tu correo para restablecer la contraseña.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email" className="eyebrow">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="rounded-2xl h-12"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-12 rounded-full vapor-bg text-primary-foreground font-bold shadow-glow"
            disabled={submitting}
          >
            {submitting ? 'Enviando…' : 'Enviar enlace de recuperación'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
