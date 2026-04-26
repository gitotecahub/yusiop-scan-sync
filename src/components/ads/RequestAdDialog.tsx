import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Megaphone, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SECTORS = [
  { value: 'musica', label: 'Música' },
  { value: 'eventos', label: 'Eventos' },
  { value: 'moda', label: 'Moda' },
  { value: 'alimentacion', label: 'Alimentación' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'educacion', label: 'Educación' },
  { value: 'otro', label: 'Otro' },
];

const AD_TYPES = [
  { value: 'app', label: 'App YUSIOP' },
  { value: 'cards', label: 'Tarjetas físicas' },
  { value: 'app_cards', label: 'App + tarjetas' },
];

const RequestAdDialog = ({ open, onOpenChange }: Props) => {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [adType, setAdType] = useState('app');
  const [sector, setSector] = useState('');
  const [message, setMessage] = useState('');
  const [budget, setBudget] = useState('');
  const [dates, setDates] = useState('');
  const [assetFile, setAssetFile] = useState<File | null>(null);

  const reset = () => {
    setName(''); setCompany(''); setEmail(''); setPhone('');
    setAdType('app'); setSector(''); setMessage(''); setBudget('');
    setDates(''); setAssetFile(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error('El nombre es obligatorio');
    if (!email.trim()) return toast.error('El email es obligatorio');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return toast.error('Email inválido');

    setSubmitting(true);
    try {
      let assetUrl: string | null = null;

      if (assetFile) {
        const { data: { user } } = await supabase.auth.getUser();
        const folder = user?.id ?? 'anonymous';
        const ext = assetFile.name.split('.').pop() ?? 'bin';
        const path = `${folder}/requests/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('ad-assets')
          .upload(path, assetFile, { cacheControl: '3600' });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('ad-assets').getPublicUrl(path);
        assetUrl = pub.publicUrl;
      }

      const { error } = await supabase.rpc('submit_ad_request', {
        p_name: name.trim(),
        p_email: email.trim(),
        p_ad_type: adType,
        p_company_name: company.trim() || null,
        p_phone: phone.trim() || null,
        p_sector: sector || null,
        p_message: message.trim() || null,
        p_budget: budget.trim() || null,
        p_desired_dates: dates.trim() || null,
        p_asset_url: assetUrl,
      });
      if (error) throw error;

      toast.success('Solicitud enviada. El equipo de YUSIOP revisará tu campaña y se pondrá en contacto contigo.');
      reset();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? 'No se pudo enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Quiero publicidad en YUSIOP
          </DialogTitle>
          <DialogDescription>
            Cuéntanos sobre tu campaña y nuestro equipo te contactará con una propuesta a medida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ad-name">Nombre *</Label>
              <Input id="ad-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
            </div>
            <div>
              <Label htmlFor="ad-company">Empresa</Label>
              <Input id="ad-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ad-email">Email *</Label>
              <Input id="ad-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
            </div>
            <div>
              <Label htmlFor="ad-phone">Teléfono / WhatsApp</Label>
              <Input id="ad-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+34 ..." />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Tipo de publicidad</Label>
              <Select value={adType} onValueChange={setAdType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sector</Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  {SECTORS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="ad-message">Mensaje / objetivo</Label>
            <Textarea
              id="ad-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="¿Qué quieres conseguir con esta campaña?"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ad-budget">Presupuesto aprox.</Label>
              <Input id="ad-budget" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ej: 100€" />
            </div>
            <div>
              <Label htmlFor="ad-dates">Fechas deseadas</Label>
              <Input id="ad-dates" value={dates} onChange={(e) => setDates(e.target.value)} placeholder="Ej: marzo 2026" />
            </div>
          </div>

          <div>
            <Label htmlFor="ad-asset">Material gráfico (opcional)</Label>
            <label
              htmlFor="ad-asset"
              className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:border-primary/60 transition-colors text-sm"
            >
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground truncate">
                {assetFile?.name ?? 'Subir imagen, PDF o vídeo (máx. 20MB)'}
              </span>
              <input
                id="ad-asset"
                type="file"
                className="hidden"
                accept="image/*,application/pdf,video/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 20 * 1024 * 1024) return toast.error('Máximo 20MB');
                  setAssetFile(f);
                }}
              />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enviar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestAdDialog;
