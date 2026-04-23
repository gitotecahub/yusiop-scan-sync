import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Calculator, Coins, TrendingUp, Users as UsersIcon, Package, Briefcase } from 'lucide-react';

// Currency
const XAF_PER_EUR = 655.957;
const formatEUR = (xaf: number) =>
  `${(xaf / XAF_PER_EUR).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
const formatEURRaw = (eur: number) =>
  `${eur.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tarjetas vendidas / año</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Package className="h-5 w-5 text-yusiop-primary" />
              {totals.totalUnits.toLocaleString('es-ES')}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ingresos brutos anuales</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Coins className="h-5 w-5 text-yusiop-primary" />
              {formatEUR(totals.totalGross)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bolsa artistas ({artistShare}%)</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-yusiop-primary" />
              {formatEUR(totals.totalArtist)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Plataforma ({100 - artistShare}%)</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yusiop-primary" />
              {formatEUR(totals.totalPlatform)}
            </CardTitle>
          </CardHeader>
        </Card>
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
              label={`Plataforma bruto (${100 - artistShare}%)`}
              value={formatEUR(totals.totalPlatform)}
              bold
            />
            <Row label="Costes de producción" value={`- ${formatEUR(totals.totalCosts)}`} />
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
  value: string;
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

export default SalesSimulator;
