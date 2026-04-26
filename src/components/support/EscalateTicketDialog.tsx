import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

const TICKET_CATEGORIES = [
  { value: 'qr', label: 'Código QR' },
  { value: 'downloads', label: 'Descargas' },
  { value: 'payments', label: 'Pagos / Compras' },
  { value: 'cards', label: 'Tarjetas y créditos' },
  { value: 'subscriptions', label: 'Suscripciones' },
  { value: 'artist', label: 'Modo Artista' },
  { value: 'collaborations', label: 'Colaboraciones' },
  { value: 'other', label: 'Otro' },
] as const;

const schema = z.object({
  category: z.enum([
    'qr', 'downloads', 'payments', 'cards', 'subscriptions', 'artist', 'collaborations', 'other',
  ]),
  subject: z.string().trim().min(3, 'El asunto debe tener al menos 3 caracteres').max(140),
  description: z.string().trim().min(10, 'Cuéntanos un poco más (mínimo 10 caracteres)').max(2000),
});

interface EscalateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory?: string;
  defaultDescription?: string;
  onCreated?: (ticketId: string) => void;
}

export default function EscalateTicketDialog({
  open,
  onOpenChange,
  defaultCategory,
  defaultDescription,
  onCreated,
}: EscalateTicketDialogProps) {
  const { user } = useAuthStore();
  const [category, setCategory] = useState<string>(defaultCategory ?? 'other');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState(defaultDescription ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory(defaultCategory ?? 'other');
      setSubject('');
      setDescription(defaultDescription ?? '');
    }
  }, [open, defaultCategory, defaultDescription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Debes iniciar sesión para crear un ticket');
      return;
    }

    const parsed = schema.safeParse({ category, subject, description });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    try {
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          category: parsed.data.category,
          subject: parsed.data.subject,
          description: parsed.data.description,
        })
        .select('id')
        .single();
      if (error) throw error;

      // Mensaje inicial del usuario en el ticket
      await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        sender_type: 'user',
        sender_user_id: user.id,
        message: parsed.data.description,
      });

      toast.success('Tu solicitud ha sido enviada. El equipo de YUSIOP la revisará lo antes posible.');
      onCreated?.(ticket.id);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo crear el ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Hablar con soporte</DialogTitle>
          <DialogDescription>
            Envía tu caso al equipo de YUSIOP. Te responderemos lo antes posible.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Asunto</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Resumen breve de tu problema"
              maxLength={140}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cuéntanos los detalles…"
              rows={5}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/2000</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
