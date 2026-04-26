import { useState } from 'react';
import { Sparkles, Zap, Megaphone } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export type PromoPlan = 'basic' | 'boost' | 'featured';

export interface PromoData {
  enabled: boolean;
  plan: PromoPlan | null;
  ad_text: string;
  cta_text: string;
  start_date: string;
}

export const PROMO_PLANS: {
  id: PromoPlan;
  label: string;
  days: number;
  priceEur: number;
  desc: string;
}[] = [
  { id: 'basic', label: 'Básico', days: 1, priceEur: 5, desc: '24 horas en banner Home' },
  { id: 'boost', label: 'Impulso', days: 3, priceEur: 15, desc: '3 días en banner Home' },
  { id: 'featured', label: 'Destacado', days: 7, priceEur: 40, desc: '7 días en banner Home + prioridad' },
];

interface Props {
  value: PromoData;
  onChange: (next: PromoData) => void;
  defaultTitle: string;
}

const PromoteReleaseBlock = ({ value, onChange, defaultTitle }: Props) => {
  const setField = (patch: Partial<PromoData>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center shadow-lg flex-shrink-0">
            <Megaphone className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              Impulsa tu lanzamiento
              <Sparkles className="h-4 w-4 text-primary" />
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aparece en el banner superior de YUSIOP y llega a más usuarios desde el primer día.
            </p>
          </div>
        </div>
        <Switch
          checked={value.enabled}
          onCheckedChange={(c) => setField({ enabled: c, plan: c ? (value.plan ?? 'boost') : null })}
        />
      </div>

      {value.enabled && (
        <>
          <div className="grid gap-2">
            {PROMO_PLANS.map((p) => {
              const selected = value.plan === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setField({ plan: p.id })}
                  className={`text-left rounded-lg p-3 transition-all border ${
                    selected
                      ? 'border-transparent bg-gradient-to-r from-primary/15 via-accent/15 to-secondary/15 ring-2 ring-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)]'
                      : 'border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-md flex items-center justify-center ${
                        selected
                          ? 'bg-gradient-to-br from-primary via-accent to-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}>
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{p.label}</div>
                        <div className="text-[11px] text-muted-foreground">{p.desc}</div>
                      </div>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${selected ? 'text-primary' : 'text-foreground'}`}>
                      {p.priceEur} €
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="promo_ad_text" className="text-xs">Texto del anuncio</Label>
              <Input
                id="promo_ad_text"
                value={value.ad_text}
                onChange={(e) => setField({ ad_text: e.target.value })}
                placeholder={`Nuevo single de ${defaultTitle || 'tu artista'}`}
                maxLength={80}
              />
            </div>
            <div>
              <Label htmlFor="promo_cta" className="text-xs">CTA del botón</Label>
              <Input
                id="promo_cta"
                value={value.cta_text}
                onChange={(e) => setField({ cta_text: e.target.value })}
                placeholder="Escuchar ahora"
                maxLength={30}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="promo_start" className="text-xs">Fecha deseada de inicio</Label>
            <Input
              id="promo_start"
              type="date"
              value={value.start_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setField({ start_date: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Tras el pago, la campaña pasará a revisión y se activará en la fecha indicada.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default PromoteReleaseBlock;
