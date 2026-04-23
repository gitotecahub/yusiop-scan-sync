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

// Defaults físicas (XAF base)
const DEFAULT_STD_PRICE_XAF = 3000;
const DEFAULT_PREM_PRICE_XAF = 7000;
const DEFAULT_STD_CREDITS = 4;
const DEFAULT_PREM_CREDITS = 100;
const DEFAULT_ARTIST_SHARE = 40; // %
const DEFAULT_INVESTOR_SHARE = 10; // %
const DEFAULT_PLATFORM_SHARE = 50; // %

// Defaults virtuales (EUR base, sin costes de producción)
const DEFAULT_VSTD_PRICE_EUR = 5;
const DEFAULT_VPREM_PRICE_EUR = 10;
const DEFAULT_VSTD_CREDITS = 4;
const DEFAULT_VPREM_CREDITS = 10;

const SalesSimulator = () => {
  // Pricing inputs
  const [stdPrice, setStdPrice] = useState(DEFAULT_STD_PRICE_XAF);
  const [premPrice, setPremPrice] = useState(DEFAULT_PREM_PRICE_XAF);
  const [stdCredits, setStdCredits] = useState(DEFAULT_STD_CREDITS);
  const [premCredits, setPremCredits] = useState(DEFAULT_PREM_CREDITS);
  const [artistShare, setArtistShare] = useState(DEFAULT_ARTIST_SHARE);
  const [investorShare, setInvestorShare] = useState(DEFAULT_INVESTOR_SHARE);
  const [platformShare, setPlatformShare] = useState(DEFAULT_PLATFORM_SHARE);

  // Volume inputs físicas (annual)
  const [stdYearly, setStdYearly] = useState(1000);
  const [premYearly, setPremYearly] = useState(200);

  // Optional cost inputs físicas (XAF per unit) — opcional, para neto
  const [stdCostXAF, setStdCostXAF] = useState(0);
  const [premCostXAF, setPremCostXAF] = useState(0);

  // ----- Virtuales (EUR) -----
  const [vStdPriceEUR, setVStdPriceEUR] = useState(DEFAULT_VSTD_PRICE_EUR);
  const [vPremPriceEUR, setVPremPriceEUR] = useState(DEFAULT_VPREM_PRICE_EUR);
  const [vStdCredits, setVStdCredits] = useState(DEFAULT_VSTD_CREDITS);
  const [vPremCredits, setVPremCredits] = useState(DEFAULT_VPREM_CREDITS);
  const [vStdYearly, setVStdYearly] = useState(500);
  const [vPremYearly, setVPremYearly] = useState(100);

  const totals = useMemo(() => {
    // ----- Físicas (XAF) -----
    const stdGross = stdPrice * stdYearly;
    const premGross = premPrice * premYearly;
    const physicalGross = stdGross + premGross;

    // ----- Virtuales (EUR → convertimos a XAF para unificar) -----
    const vStdGrossEUR = vStdPriceEUR * vStdYearly;
    const vPremGrossEUR = vPremPriceEUR * vPremYearly;
    const virtualGrossEUR = vStdGrossEUR + vPremGrossEUR;
    const vStdGrossXAF = vStdGrossEUR * XAF_PER_EUR;
    const vPremGrossXAF = vPremGrossEUR * XAF_PER_EUR;
    const virtualGrossXAF = virtualGrossEUR * XAF_PER_EUR;

    const totalGross = physicalGross + virtualGrossXAF;

    const artistPct = artistShare / 100;
    const investorPct = investorShare / 100;
    const platformPct = platformShare / 100;

    const stdArtist = stdGross * artistPct;
    const premArtist = premGross * artistPct;
    const vStdArtist = vStdGrossXAF * artistPct;
    const vPremArtist = vPremGrossXAF * artistPct;
    const totalArtist = stdArtist + premArtist + vStdArtist + vPremArtist;

    const totalInvestor = totalGross * investorPct;
    const totalPlatform = totalGross * platformPct;

    // Las virtuales no tienen costes de producción
    const totalCosts = stdCostXAF * stdYearly + premCostXAF * premYearly;
    const platformNet = totalPlatform - totalCosts;

    const physicalUnits = stdYearly + premYearly;
    const virtualUnits = vStdYearly + vPremYearly;
    const totalUnits = physicalUnits + virtualUnits;

    const monthlyGross = totalGross / 12;
    const monthlyPlatform = totalPlatform / 12;
    const monthlyInvestor = totalInvestor / 12;
    const monthlyArtist = totalArtist / 12;
    const monthlyNet = platformNet / 12;

    const totalDownloads =
      stdCredits * stdYearly +
      premCredits * premYearly +
      vStdCredits * vStdYearly +
      vPremCredits * vPremYearly;
    const valuePerDlStd = stdCredits > 0 ? stdPrice / stdCredits : 0;
    const valuePerDlPrem = premCredits > 0 ? premPrice / premCredits : 0;
    const valuePerDlVStd = vStdCredits > 0 ? vStdPriceEUR / vStdCredits : 0;
    const valuePerDlVPrem = vPremCredits > 0 ? vPremPriceEUR / vPremCredits : 0;

    return {
      stdGross,
      premGross,
      physicalGross,
      vStdGrossEUR,
      vPremGrossEUR,
      virtualGrossEUR,
      vStdGrossXAF,
      vPremGrossXAF,
      virtualGrossXAF,
      totalGross,
      stdArtist,
      premArtist,
      vStdArtist,
      vPremArtist,
      totalArtist,
      totalInvestor,
      totalPlatform,
      totalCosts,
      platformNet,
      physicalUnits,
      virtualUnits,
      totalUnits,
      monthlyGross,
      monthlyPlatform,
      monthlyInvestor,
      monthlyArtist,
      monthlyNet,
      totalDownloads,
      valuePerDlStd,
      valuePerDlPrem,
      valuePerDlVStd,
      valuePerDlVPrem,
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
    vStdPriceEUR,
    vPremPriceEUR,
    vStdCredits,
    vPremCredits,
    vStdYearly,
    vPremYearly,
  ]);

  const resetDefaults = () => {
    setStdPrice(DEFAULT_STD_PRICE_XAF);
    setPremPrice(DEFAULT_PREM_PRICE_XAF);
    setStdCredits(DEFAULT_STD_CREDITS);
    setPremCredits(DEFAULT_PREM_CREDITS);
    setArtistShare(DEFAULT_ARTIST_SHARE);
    setInvestorShare(DEFAULT_INVESTOR_SHARE);
    setPlatformShare(DEFAULT_PLATFORM_SHARE);
    setVStdPriceEUR(DEFAULT_VSTD_PRICE_EUR);
    setVPremPriceEUR(DEFAULT_VPREM_PRICE_EUR);
    setVStdCredits(DEFAULT_VSTD_CREDITS);
    setVPremCredits(DEFAULT_VPREM_CREDITS);
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
          <CardTitle>Tarjetas físicas (XAF)</CardTitle>
          <CardDescription>
            Tarjetas vendidas físicamente con QR / código manual. Precio en francos CFA,
            con coste opcional de producción por unidad.
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

          {/* Volumen físicas */}
          <div>
            <h4 className="font-semibold mb-3">Volumen anual de tarjetas físicas</h4>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Estándar / año</Label>
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
                  <Label>Premium / año</Label>
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
          </div>
        </CardContent>
      </Card>

      {/* Tarjetas virtuales (EUR) */}
      <Card>
        <CardHeader>
          <CardTitle>Tarjetas virtuales (EUR)</CardTitle>
          <CardDescription>
            Tarjetas digitales vendidas online (Stripe). Precio en euros, sin coste
            de producción.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Virtual Standard */}
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" /> Estándar virtual
              </h3>
              <div className="space-y-2">
                <Label>Precio (EUR)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={vStdPriceEUR}
                  onChange={(e) => setVStdPriceEUR(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Equivale a {formatXAFNumber(vStdPriceEUR * XAF_PER_EUR)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Descargas incluidas</Label>
                <Input
                  type="number"
                  min={1}
                  value={vStdCredits}
                  onChange={(e) => setVStdCredits(Number(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">
                  Valor por descarga:{' '}
                  {totals.valuePerDlVStd.toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  €
                </p>
              </div>
            </div>

            {/* Virtual Premium */}
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" /> Premium virtual
              </h3>
              <div className="space-y-2">
                <Label>Precio (EUR)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={vPremPriceEUR}
                  onChange={(e) => setVPremPriceEUR(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Equivale a {formatXAFNumber(vPremPriceEUR * XAF_PER_EUR)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Descargas incluidas</Label>
                <Input
                  type="number"
                  min={1}
                  value={vPremCredits}
                  onChange={(e) => setVPremCredits(Number(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">
                  Valor por descarga:{' '}
                  {totals.valuePerDlVPrem.toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  €
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Volumen virtuales */}
          <div>
            <h4 className="font-semibold mb-3">Volumen anual de tarjetas virtuales</h4>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Estándar virtual / año</Label>
                  <Input
                    type="number"
                    min={0}
                    value={vStdYearly}
                    onChange={(e) => setVStdYearly(Number(e.target.value) || 0)}
                    className="w-32 text-right"
                  />
                </div>
                <Slider
                  value={[vStdYearly]}
                  onValueChange={(v) => setVStdYearly(v[0])}
                  min={0}
                  max={50000}
                  step={100}
                />
                <p className="text-xs text-muted-foreground">
                  Ingreso bruto:{' '}
                  <span className="font-semibold">{formatEURRaw(totals.vStdGrossEUR)}</span>
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Premium virtual / año</Label>
                  <Input
                    type="number"
                    min={0}
                    value={vPremYearly}
                    onChange={(e) => setVPremYearly(Number(e.target.value) || 0)}
                    className="w-32 text-right"
                  />
                </div>
                <Slider
                  value={[vPremYearly]}
                  onValueChange={(v) => setVPremYearly(v[0])}
                  min={0}
                  max={20000}
                  step={50}
                />
                <p className="text-xs text-muted-foreground">
                  Ingreso bruto:{' '}
                  <span className="font-semibold">{formatEURRaw(totals.vPremGrossEUR)}</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reparto global */}
      <Card>
        <CardHeader>
          <CardTitle>Reparto de ingresos brutos</CardTitle>
          <CardDescription>
            Aplica al total combinado (físicas + virtuales). Por defecto: 40% artistas,
            10% inversor, 50% plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Resumen ingresos por origen */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-yusiop-primary" />
              Ingresos físicas / año
            </CardTitle>
            <CardDescription>
              {totals.physicalUnits.toLocaleString('es-ES')} tarjetas físicas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {formatXAFNumber(totals.physicalGross)}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              ≈ {formatEURNumber(totals.physicalGross)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-yusiop-primary" />
              Ingresos virtuales / año
            </CardTitle>
            <CardDescription>
              {totals.virtualUnits.toLocaleString('es-ES')} tarjetas virtuales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {totals.virtualGrossEUR.toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              €
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              ≈ {formatXAFNumber(totals.virtualGrossXAF)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Investor ROI progress */}
      <InvestorProgress totalInvestorXAF={totals.totalInvestor} />

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
            <Row label="Físicas Estándar (XAF)" value={formatEUR(totals.stdGross)} />
            <Row label="Físicas Premium (XAF)" value={formatEUR(totals.premGross)} />
            <Row label="Total físicas" value={formatEUR(totals.physicalGross)} bold />
            <Separator />
            <Row label="Virtuales Estándar (EUR)" value={formatEURRaw(totals.vStdGrossEUR)} />
            <Row label="Virtuales Premium (EUR)" value={formatEURRaw(totals.vPremGrossEUR)} />
            <Row label="Total virtuales" value={formatEURRaw(totals.virtualGrossEUR)} bold />
            <Separator />
            <Row label="Total combinado" value={formatEUR(totals.totalGross)} bold highlight />
            <Separator />
            <Row label="Bolsa artistas físicas" value={formatEUR(totals.stdArtist + totals.premArtist)} />
            <Row label="Bolsa artistas virtuales" value={formatEUR(totals.vStdArtist + totals.vPremArtist)} />
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

// Capital inicial y objetivo del inversor
const INVESTOR_CAPITAL_EUR = 26500;
const INVESTOR_OPEX_EUR = 16000;
const INVESTOR_INTEREST_PCT = 0.25;
const INVESTOR_TARGET_EUR = INVESTOR_CAPITAL_EUR * (1 + INVESTOR_INTEREST_PCT); // 33.125 €

const InvestorProgress = ({ totalInvestorXAF }: { totalInvestorXAF: number }) => {
  const investorEUR = totalInvestorXAF / XAF_PER_EUR;
  const pct = Math.max(0, Math.min(100, (investorEUR / INVESTOR_TARGET_EUR) * 100));
  const remaining = Math.max(0, INVESTOR_TARGET_EUR - investorEUR);
  const reached = investorEUR >= INVESTOR_TARGET_EUR;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-yusiop-primary" />
          Retorno del inversor
        </CardTitle>
        <CardDescription>
          Capital inicial {INVESTOR_CAPITAL_EUR.toLocaleString('es-ES')} € + 25% de intereses ={' '}
          <span className="font-semibold text-foreground">
            {INVESTOR_TARGET_EUR.toLocaleString('es-ES')} €
          </span>
          . Costes operativos de referencia: {INVESTOR_OPEX_EUR.toLocaleString('es-ES')} €.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative h-7 w-full overflow-hidden rounded-full border border-border/60 bg-muted/40 shadow-inner">
          {/* Barra degradada rojo→verde, estilo cristal */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background:
                'linear-gradient(90deg, hsl(0 85% 55%) 0%, hsl(35 90% 55%) 40%, hsl(70 80% 50%) 70%, hsl(140 75% 45%) 100%)',
              boxShadow:
                'inset 0 1px 0 hsl(0 0% 100% / 0.45), inset 0 -6px 10px hsl(0 0% 0% / 0.18), 0 0 12px hsl(var(--primary) / 0.15)',
            }}
          >
            {/* Brillo cristal superior */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full"
              style={{
                background:
                  'linear-gradient(180deg, hsl(0 0% 100% / 0.45) 0%, hsl(0 0% 100% / 0.05) 100%)',
              }}
            />
          </div>
          {/* Marcador de objetivo (100%) */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <span
              className={`text-[10px] font-semibold tabular-nums ${
                reached ? 'text-white drop-shadow' : 'text-muted-foreground'
              }`}
            >
              {pct.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Ganancias del inversor / año</p>
            <p className="font-semibold tabular-nums">
              {investorEUR.toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              €
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Objetivo (capital + 25%)</p>
            <p className="font-semibold tabular-nums">
              {INVESTOR_TARGET_EUR.toLocaleString('es-ES')} €
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">
              {reached ? 'Estado' : 'Pendiente por devolver'}
            </p>
            <p
              className={`font-semibold tabular-nums ${
                reached ? 'text-green-500' : 'text-destructive'
              }`}
            >
              {reached
                ? '✓ Inversión recuperada con intereses'
                : `${remaining.toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} €`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesSimulator;
