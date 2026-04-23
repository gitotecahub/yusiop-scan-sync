import { useMemo, useState, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Calculator, Coins, TrendingUp, Users as UsersIcon, Package, Briefcase } from 'lucide-react';

// Currency
const XAF_PER_EUR = 655.957;
const formatXAFNumber = (xaf: number) =>
  `${Math.round(xaf).toLocaleString('es-ES')} XAF`;
const formatEURNumber = (xaf: number) =>
  `${(xaf / XAF_PER_EUR).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;

// Importe en EUR con la equivalencia XAF debajo, como descripción.
// `align` controla si el bloque se alinea a la izquierda (KPIs) o a la derecha (filas).
const formatEUR = (xaf: number, align: 'left' | 'right' = 'right'): ReactNode => (
  <span
    className={`inline-flex flex-col leading-tight ${
      align === 'right' ? 'items-end' : 'items-start'
    }`}
  >
    <span className="whitespace-nowrap tabular-nums">{formatEURNumber(xaf)}</span>
    <span className="text-[0.6em] font-normal text-muted-foreground/70 whitespace-nowrap tabular-nums">
      {formatXAFNumber(xaf)}
    </span>
  </span>
);
const formatEURRaw = (eur: number): ReactNode => (
  <span className="inline-flex flex-col items-end leading-tight">
    <span className="whitespace-nowrap tabular-nums">
      {eur.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
    </span>
    <span className="text-[0.6em] font-normal text-muted-foreground/70 whitespace-nowrap tabular-nums">
      {Math.round(eur * XAF_PER_EUR).toLocaleString('es-ES')} XAF
    </span>
  </span>
);

// Defaults (XAF base)
const DEFAULT_STD_PRICE_XAF = 3000;
const DEFAULT_PREM_PRICE_XAF = 7000;
const DEFAULT_STD_CREDITS = 4;
const DEFAULT_PREM_CREDITS = 100;
const DEFAULT_ARTIST_SHARE = 40; // %
const DEFAULT_INVESTOR_SHARE = 10; // %
const DEFAULT_PLATFORM_SHARE = 50; // %

const SalesSimulator = () => {
  // Pricing inputs
  const [stdPrice, setStdPrice] = useState(DEFAULT_STD_PRICE_XAF);
  const [premPrice, setPremPrice] = useState(DEFAULT_PREM_PRICE_XAF);
  const [stdCredits, setStdCredits] = useState(DEFAULT_STD_CREDITS);
  const [premCredits, setPremCredits] = useState(DEFAULT_PREM_CREDITS);
  const [artistShare, setArtistShare] = useState(DEFAULT_ARTIST_SHARE);
  const [investorShare, setInvestorShare] = useState(DEFAULT_INVESTOR_SHARE);
  const [platformShare, setPlatformShare] = useState(DEFAULT_PLATFORM_SHARE);

  // Volume inputs (annual)
  const [stdYearly, setStdYearly] = useState(1000);
  const [premYearly, setPremYearly] = useState(200);

  // Optional cost inputs (XAF per unit) — opcional, para neto
  const [stdCostXAF, setStdCostXAF] = useState(0);
  const [premCostXAF, setPremCostXAF] = useState(0);

  const totals = useMemo(() => {
    const stdGross = stdPrice * stdYearly;
    const premGross = premPrice * premYearly;
    const totalGross = stdGross + premGross;

    const artistPct = artistShare / 100;
    const investorPct = investorShare / 100;
    const platformPct = platformShare / 100;

    const stdArtist = stdGross * artistPct;
    const premArtist = premGross * artistPct;
    const totalArtist = stdArtist + premArtist;

    const totalInvestor = totalGross * investorPct;
    const totalPlatform = totalGross * platformPct;

    const totalCosts = stdCostXAF * stdYearly + premCostXAF * premYearly;
    const platformNet = totalPlatform - totalCosts;

    const totalUnits = stdYearly + premYearly;
    const monthlyGross = totalGross / 12;
    const monthlyPlatform = totalPlatform / 12;
    const monthlyInvestor = totalInvestor / 12;
    const monthlyArtist = totalArtist / 12;
    const monthlyNet = platformNet / 12;

    // Credits / downloads enabled
    const totalDownloads = stdCredits * stdYearly + premCredits * premYearly;
    const valuePerDlStd = stdCredits > 0 ? stdPrice / stdCredits : 0;
    const valuePerDlPrem = premCredits > 0 ? premPrice / premCredits : 0;

    return {
      stdGross,
      premGross,
      totalGross,
      stdArtist,
      premArtist,
      totalArtist,
      totalInvestor,
      totalPlatform,
      totalCosts,
      platformNet,
      totalUnits,
      monthlyGross,
      monthlyPlatform,
      monthlyInvestor,
      monthlyArtist,
      monthlyNet,
      totalDownloads,
      valuePerDlStd,
      valuePerDlPrem,
    };
  }, [
    stdPrice,
    premPrice,
    stdCredits,
    premCredits,
    artistShare,
    investorShare,
    platformShare,
    stdYearly,
    premYearly,
    stdCostXAF,
    premCostXAF,
  ]);

  const resetDefaults = () => {
    setStdPrice(DEFAULT_STD_PRICE_XAF);
    setPremPrice(DEFAULT_PREM_PRICE_XAF);
    setStdCredits(DEFAULT_STD_CREDITS);
    setPremCredits(DEFAULT_PREM_CREDITS);
    setArtistShare(DEFAULT_ARTIST_SHARE);
    setInvestorShare(DEFAULT_INVESTOR_SHARE);
    setPlatformShare(DEFAULT_PLATFORM_SHARE);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-7 w-7 text-yusiop-primary" />
            Simulador de ventas
          </h1>
          <p className="text-muted-foreground">
            Calcula tus ingresos anuales según el volumen estimado de tarjetas vendidas.
            Todos los importes en euros (paridad fija FCFA: 1 € = {XAF_PER_EUR} XAF).
          </p>
        </div>
        <button
          onClick={resetDefaults}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Restablecer valores por defecto
        </button>
      </div>

      {/* Pricing config */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de precios y créditos</CardTitle>
          <CardDescription>
            Ajusta el precio (XAF), descargas incluidas y reparto del artista.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Standard */}
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" /> Tarjeta Estándar
              </h3>
              <div className="space-y-2">
                <Label>Precio (XAF)</Label>
                <Input
                  type="number"
                  min={0}
                  value={stdPrice}
                  onChange={(e) => setStdPrice(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Equivale a {formatEUR(stdPrice)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Descargas incluidas</Label>
                <Input
                  type="number"
                  min={1}
                  value={stdCredits}
                  onChange={(e) => setStdCredits(Number(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">
                  Valor por descarga: {formatEUR(totals.valuePerDlStd)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Coste unitario (XAF, opcional)</Label>
                <Input
                  type="number"
                  min={0}
                  value={stdCostXAF}
                  onChange={(e) => setStdCostXAF(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Producción / logística por tarjeta. {formatEUR(stdCostXAF)} por unidad.
                </p>
              </div>
            </div>

            {/* Premium */}
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" /> Tarjeta Premium
              </h3>
              <div className="space-y-2">
                <Label>Precio (XAF)</Label>
                <Input
                  type="number"
                  min={0}
                  value={premPrice}
                  onChange={(e) => setPremPrice(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Equivale a {formatEUR(premPrice)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Descargas incluidas</Label>
                <Input
                  type="number"
                  min={1}
                  value={premCredits}
                  onChange={(e) => setPremCredits(Number(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">
                  Valor por descarga: {formatEUR(totals.valuePerDlPrem)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Coste unitario (XAF, opcional)</Label>
                <Input
                  type="number"
                  min={0}
                  value={premCostXAF}
                  onChange={(e) => setPremCostXAF(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Producción / logística por tarjeta. {formatEUR(premCostXAF)} por unidad.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">Reparto de ingresos brutos</h4>
              <p className="text-xs text-muted-foreground">
                Ajusta los porcentajes entre artistas, inversor y plataforma. Por defecto:
                40% artistas, 10% inversor, 50% plataforma.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Bolsa artistas (%)</Label>
                <span className="text-sm font-semibold">{artistShare}%</span>
              </div>
              <Slider
                value={[artistShare]}
                onValueChange={(v) => setArtistShare(v[0])}
                min={0}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Inversor (%)</Label>
                <span className="text-sm font-semibold">{investorShare}%</span>
              </div>
              <Slider
                value={[investorShare]}
                onValueChange={(v) => setInvestorShare(v[0])}
                min={0}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Plataforma (%)</Label>
                <span className="text-sm font-semibold">{platformShare}%</span>
              </div>
              <Slider
                value={[platformShare]}
                onValueChange={(v) => setPlatformShare(v[0])}
                min={0}
                max={100}
                step={1}
              />
            </div>

            {(() => {
              const sum = artistShare + investorShare + platformShare;
              const ok = sum === 100;
              return (
                <div
                  className={`text-xs px-3 py-2 rounded-md border ${
                    ok
                      ? 'bg-muted/40 text-muted-foreground'
                      : 'bg-destructive/10 text-destructive border-destructive/30'
                  }`}
                >
                  Suma actual: <span className="font-semibold">{sum}%</span>{' '}
                  {ok ? '✓ correcto' : '— debe sumar 100% para un reparto coherente'}
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Volume config */}
      <Card>
        <CardHeader>
          <CardTitle>Volumen anual estimado</CardTitle>
          <CardDescription>
            Introduce cuántas tarjetas esperas vender al año de cada tipo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tarjetas Estándar / año</Label>
                <Input
                  type="number"
                  min={0}
                  value={stdYearly}
                  onChange={(e) => setStdYearly(Number(e.target.value) || 0)}
                  className="w-32 text-right"
                />
              </div>
              <Slider
                value={[stdYearly]}
                onValueChange={(v) => setStdYearly(v[0])}
                min={0}
                max={50000}
                step={100}
              />
              <p className="text-xs text-muted-foreground">
                Ingreso bruto: <span className="font-semibold">{formatEUR(totals.stdGross)}</span>
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tarjetas Premium / año</Label>
                <Input
                  type="number"
                  min={0}
                  value={premYearly}
                  onChange={(e) => setPremYearly(Number(e.target.value) || 0)}
                  className="w-32 text-right"
                />
              </div>
              <Slider
                value={[premYearly]}
                onValueChange={(v) => setPremYearly(v[0])}
                min={0}
                max={20000}
                step={50}
              />
              <p className="text-xs text-muted-foreground">
                Ingreso bruto: <span className="font-semibold">{formatEUR(totals.premGross)}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          icon={<Package className="h-4 w-4 text-yusiop-primary" />}
          label="Tarjetas vendidas / año"
        >
          <span className="whitespace-nowrap tabular-nums">
            {totals.totalUnits.toLocaleString('es-ES')}
          </span>
        </KpiCard>
        <KpiCard
          icon={<Coins className="h-4 w-4 text-yusiop-primary" />}
          label="Ingresos brutos anuales"
        >
          {formatEUR(totals.totalGross, 'left')}
        </KpiCard>
        <KpiCard
          icon={<UsersIcon className="h-4 w-4 text-yusiop-primary" />}
          label={`Bolsa artistas (${artistShare}%)`}
        >
          {formatEUR(totals.totalArtist, 'left')}
        </KpiCard>
        <KpiCard
          icon={<Briefcase className="h-4 w-4 text-yusiop-primary" />}
          label={`Inversor (${investorShare}%)`}
        >
          {formatEUR(totals.totalInvestor, 'left')}
        </KpiCard>
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 text-yusiop-primary" />}
          label={`Plataforma (${platformShare}%)`}
        >
          {formatEUR(totals.totalPlatform, 'left')}
        </KpiCard>
      </div>

      {/* Detailed breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Desglose anual</CardTitle>
            <CardDescription>Resultados detallados de la simulación.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Ingresos brutos Estándar" value={formatEUR(totals.stdGross)} />
            <Row label="Ingresos brutos Premium" value={formatEUR(totals.premGross)} />
            <Separator />
            <Row label="Bolsa artistas Estándar" value={formatEUR(totals.stdArtist)} />
            <Row label="Bolsa artistas Premium" value={formatEUR(totals.premArtist)} />
            <Row
              label={`Total artistas (${artistShare}%)`}
              value={formatEUR(totals.totalArtist)}
              bold
            />
            <Separator />
            <Row
              label={`Inversor (${investorShare}%)`}
              value={formatEUR(totals.totalInvestor)}
              bold
            />
            <Separator />
            <Row
              label={`Plataforma bruto (${platformShare}%)`}
              value={formatEUR(totals.totalPlatform)}
              bold
            />
            <Row label="Costes de producción" value={<>− {formatEUR(totals.totalCosts)}</>} />
            <Row
              label="Plataforma neto"
              value={formatEUR(totals.platformNet)}
              bold
              highlight
            />
            <Separator />
            <Row label="Descargas habilitadas / año" value={totals.totalDownloads.toLocaleString('es-ES')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Promedios mensuales</CardTitle>
            <CardDescription>Reparto del año dividido entre 12 meses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Ingresos brutos / mes" value={formatEUR(totals.monthlyGross)} />
            <Row label="Bolsa artistas / mes" value={formatEUR(totals.monthlyArtist)} />
            <Row label="Inversor / mes" value={formatEUR(totals.monthlyInvestor)} />
            <Row
              label="Plataforma bruto / mes"
              value={formatEUR(totals.monthlyPlatform)}
            />
            <Row
              label="Plataforma neto / mes"
              value={formatEUR(totals.monthlyNet)}
              bold
              highlight
            />
            <Separator />
            <Row
              label="Estándar / mes"
              value={`${(stdYearly / 12).toLocaleString('es-ES', {
                maximumFractionDigits: 1,
              })} tarjetas`}
            />
            <Row
              label="Premium / mes"
              value={`${(premYearly / 12).toLocaleString('es-ES', {
                maximumFractionDigits: 1,
              })} tarjetas`}
            />
            <Separator />
            <Row
              label="Ticket medio (todas)"
              value={
                totals.totalUnits > 0
                  ? formatEURRaw(totals.totalGross / XAF_PER_EUR / totals.totalUnits)
                  : '—'
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Row = ({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: ReactNode;
  bold?: boolean;
  highlight?: boolean;
}) => (
  <div className="flex items-center justify-between py-1">
    <span className={`text-muted-foreground ${bold ? 'text-foreground' : ''}`}>{label}</span>
    <span
      className={`tabular-nums ${bold ? 'font-semibold' : ''} ${
        highlight ? 'text-yusiop-primary' : ''
      }`}
    >
      {value}
    </span>
  </div>
);

// Tarjeta KPI con tipografía fluida que se adapta al ancho disponible.
const KpiCard = ({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) => (
  <Card className="overflow-hidden">
    <CardHeader className="pb-3 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <CardDescription className="truncate">{label}</CardDescription>
      </div>
      <div
        className="font-semibold leading-tight w-full"
        style={{ fontSize: 'clamp(1rem, 2.2vw, 1.5rem)' }}
      >
        {children}
      </div>
    </CardHeader>
  </Card>
);

export default SalesSimulator;
