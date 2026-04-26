import { useMemo, useState, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Calculator, Coins, TrendingUp, Users as UsersIcon, Package, LineChart, Download } from 'lucide-react';

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
const DEFAULT_PREM_CREDITS = 10;
const DEFAULT_ARTIST_SHARE = 30; // %
const DEFAULT_PLATFORM_SHARE = 70; // %

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
    const platformPct = platformShare / 100;

    const stdArtist = stdGross * artistPct;
    const premArtist = premGross * artistPct;
    const vStdArtist = vStdGrossXAF * artistPct;
    const vPremArtist = vPremGrossXAF * artistPct;
    const totalArtist = stdArtist + premArtist + vStdArtist + vPremArtist;

    const totalPlatform = totalGross * platformPct;

    // Las virtuales no tienen costes de producción
    const totalCosts = stdCostXAF * stdYearly + premCostXAF * premYearly;
    const platformNet = totalPlatform - totalCosts;

    const physicalUnits = stdYearly + premYearly;
    const virtualUnits = vStdYearly + vPremYearly;
    const totalUnits = physicalUnits + virtualUnits;

    const monthlyGross = totalGross / 12;
    const monthlyPlatform = totalPlatform / 12;
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
      totalPlatform,
      totalCosts,
      platformNet,
      physicalUnits,
      virtualUnits,
      totalUnits,
      monthlyGross,
      monthlyPlatform,
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
            60% plataforma.
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
            const sum = artistShare + platformShare;
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



      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
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
              label="Físicas Estándar / mes"
              value={`${(stdYearly / 12).toLocaleString('es-ES', {
                maximumFractionDigits: 1,
              })} tarjetas`}
            />
            <Row
              label="Físicas Premium / mes"
              value={`${(premYearly / 12).toLocaleString('es-ES', {
                maximumFractionDigits: 1,
              })} tarjetas`}
            />
            <Row
              label="Virtuales Estándar / mes"
              value={`${(vStdYearly / 12).toLocaleString('es-ES', {
                maximumFractionDigits: 1,
              })} tarjetas`}
            />
            <Row
              label="Virtuales Premium / mes"
              value={`${(vPremYearly / 12).toLocaleString('es-ES', {
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

      {/* === SIMULADOR DE BENEFICIOS POR DESCARGAS === */}
      <DownloadsProfitSimulator
        avgValuePerDownloadXAF={
          totals.totalDownloads > 0 ? totals.totalGross / totals.totalDownloads : 0
        }
        artistShare={artistShare}
        platformShare={platformShare}
      />

      {/* === PROYECCIÓN A 5 AÑOS === */}
      <FiveYearProjection
        baseGrossXAF={totals.totalGross}
        baseUnits={totals.totalUnits}
        baseArtistXAF={totals.totalArtist}
        basePlatformXAF={totals.totalPlatform}
        baseNetXAF={totals.platformNet}
        baseCostsXAF={totals.totalCosts}
      />
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


/* =====================================================
   PROYECCIÓN A 5 AÑOS — crecimiento +10% anual
   ===================================================== */
const GROWTH_RATE = 0.1; // 10% anual
const PROJECTION_YEARS = 5;

const FiveYearProjection = ({
  baseGrossXAF,
  baseUnits,
  baseArtistXAF,
  basePlatformXAF,
  baseNetXAF,
  baseCostsXAF,
}: {
  baseGrossXAF: number;
  baseUnits: number;
  baseArtistXAF: number;
  basePlatformXAF: number;
  baseNetXAF: number;
  baseCostsXAF: number;
}) => {
  const rows = useMemo(() => {
    const out: {
      year: number;
      label: string;
      multiplier: number;
      units: number;
      grossXAF: number;
      artistXAF: number;
      platformXAF: number;
      costsXAF: number;
      netXAF: number;
    }[] = [];
    for (let i = 0; i < PROJECTION_YEARS; i++) {
      const multiplier = Math.pow(1 + GROWTH_RATE, i);
      out.push({
        year: i + 1,
        label: `Año ${i + 1}`,
        multiplier,
        units: baseUnits * multiplier,
        grossXAF: baseGrossXAF * multiplier,
        artistXAF: baseArtistXAF * multiplier,
        platformXAF: basePlatformXAF * multiplier,
        costsXAF: baseCostsXAF * multiplier,
        netXAF: baseNetXAF * multiplier,
      });
    }
    return out;
  }, [baseGrossXAF, baseUnits, baseArtistXAF, basePlatformXAF, baseNetXAF, baseCostsXAF]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        units: acc.units + r.units,
        grossXAF: acc.grossXAF + r.grossXAF,
        artistXAF: acc.artistXAF + r.artistXAF,
        platformXAF: acc.platformXAF + r.platformXAF,
        costsXAF: acc.costsXAF + r.costsXAF,
        netXAF: acc.netXAF + r.netXAF,
      }),
      { units: 0, grossXAF: 0, artistXAF: 0, platformXAF: 0, costsXAF: 0, netXAF: 0 }
    );
  }, [rows]);

  const maxGross = Math.max(...rows.map((r) => r.grossXAF), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChart className="h-5 w-5 text-yusiop-primary" />
          Proyección a 5 años
        </CardTitle>
        <CardDescription>
          Estimación del presupuesto bruto anual partiendo del lote actual de tarjetas
          (físicas + virtuales), con un <span className="font-semibold">crecimiento del 10% anual</span>{' '}
          en el volumen de ventas. Año 1 = volumen actual configurado arriba.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs resumen acumulado 5 años */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 rounded-lg border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Bruto acumulado (5 años)</p>
            <div className="font-semibold text-lg">{formatEUR(totals.grossXAF, 'left')}</div>
          </div>
          <div className="p-4 rounded-lg border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Plataforma neta acumulada</p>
            <div className="font-semibold text-lg text-yusiop-primary">
              {formatEUR(totals.netXAF, 'left')}
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Bolsa artistas acumulada</p>
            <div className="font-semibold text-lg">{formatEUR(totals.artistXAF, 'left')}</div>
          </div>
          <div className="p-4 rounded-lg border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Tarjetas vendidas (5 años)</p>
            <p className="font-semibold text-lg tabular-nums">
              {Math.round(totals.units).toLocaleString('es-ES')}
            </p>
          </div>
        </div>

        {/* Mini-gráfico de barras horizontales */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Bruto anual proyectado</h4>
          <div className="space-y-2">
            {rows.map((r) => {
              const widthPct = (r.grossXAF / maxGross) * 100;
              return (
                <div key={r.year} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {r.label}{' '}
                      <span className="text-muted-foreground font-normal">
                        (×{r.multiplier.toFixed(2)})
                      </span>
                    </span>
                    <span className="tabular-nums font-semibold">
                      {formatEURNumber(r.grossXAF)}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-yusiop-primary to-yusiop-primary/60 transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabla detallada por año */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Año</th>
                <th className="text-right px-3 py-2 font-medium">Tarjetas</th>
                <th className="text-right px-3 py-2 font-medium">Bruto</th>
                <th className="text-right px-3 py-2 font-medium">Artistas</th>
                <th className="text-right px-3 py-2 font-medium">Plataforma neto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.year} className="border-t">
                  <td className="px-3 py-2 font-medium">
                    {r.label}
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      ×{r.multiplier.toFixed(2)}
                    </span>
                  </td>
                  <td className="text-right px-3 py-2 tabular-nums">
                    {Math.round(r.units).toLocaleString('es-ES')}
                  </td>
                  <td className="text-right px-3 py-2">{formatEUR(r.grossXAF)}</td>
                  <td className="text-right px-3 py-2">{formatEUR(r.artistXAF)}</td>
                  <td className="text-right px-3 py-2 font-semibold text-yusiop-primary">
                    {formatEUR(r.netXAF)}
                  </td>
                </tr>
              ))}
              <tr className="border-t bg-muted/30 font-semibold">
                <td className="px-3 py-2">Total 5 años</td>
                <td className="text-right px-3 py-2 tabular-nums">
                  {Math.round(totals.units).toLocaleString('es-ES')}
                </td>
                <td className="text-right px-3 py-2">{formatEUR(totals.grossXAF)}</td>
                <td className="text-right px-3 py-2">{formatEUR(totals.artistXAF)}</td>
                <td className="text-right px-3 py-2 text-yusiop-primary">
                  {formatEUR(totals.netXAF)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          * Proyección lineal: cada año crece un 10% sobre el anterior, manteniendo precios,
          reparto de ingresos y costes unitarios constantes. Los ajustes de cualquier parámetro
          de arriba se reflejan automáticamente aquí.
        </p>
      </CardContent>
    </Card>
  );
};

/* =====================================================
   SIMULADOR DE BENEFICIOS POR DESCARGAS
   - El usuario introduce un nº de descargas
   - Calcula el bruto generado y el reparto artista / plataforma
   - Usa el valor medio por descarga derivado de la mezcla
     actual de tarjetas físicas + virtuales
   ===================================================== */
const DOWNLOAD_PRESETS = [100, 1_000, 10_000, 100_000, 1_000_000];

const DownloadsProfitSimulator = ({
  avgValuePerDownloadXAF,
  artistShare,
  platformShare,
}: {
  avgValuePerDownloadXAF: number;
  artistShare: number;
  platformShare: number;
}) => {
  const [downloads, setDownloads] = useState(10_000);
  const [customValueXAF, setCustomValueXAF] = useState<number | ''>('');

  const valuePerDl = customValueXAF === '' ? avgValuePerDownloadXAF : customValueXAF;

  const grossXAF = valuePerDl * downloads;
  const artistXAF = grossXAF * (artistShare / 100);
  const platformXAF = grossXAF * (platformShare / 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-yusiop-primary" />
          Simulador de beneficios por descargas
        </CardTitle>
        <CardDescription>
          Calcula rápido cuánto genera un volumen concreto de descargas.
          Por defecto se usa el valor medio por descarga calculado con la mezcla
          actual de tarjetas (físicas + virtuales). Puedes sobrescribirlo si quieres
          simular otro precio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <Label>Número de descargas</Label>
            <Input
              type="number"
              min={0}
              value={downloads}
              onChange={(e) => setDownloads(Math.max(0, Number(e.target.value) || 0))}
            />
            <Slider
              value={[Math.min(downloads, 1_000_000)]}
              onValueChange={(v) => setDownloads(v[0])}
              min={0}
              max={1_000_000}
              step={100}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {DOWNLOAD_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDownloads(n)}
                  className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                    downloads === n
                      ? 'bg-yusiop-primary text-primary-foreground border-yusiop-primary'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {n.toLocaleString('es-ES')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <Label>Valor medio por descarga (XAF)</Label>
            <Input
              type="number"
              min={0}
              placeholder={avgValuePerDownloadXAF.toFixed(2)}
              value={customValueXAF}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  setCustomValueXAF('');
                } else {
                  setCustomValueXAF(Math.max(0, Number(raw) || 0));
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Calculado de la mezcla actual:{' '}
              <span className="font-semibold">{formatEUR(avgValuePerDownloadXAF)}</span>
              {customValueXAF !== '' && (
                <>
                  {' '}
                  · Vacía el campo para volver al valor calculado.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Resultados */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <KpiCard
            icon={<Coins className="h-4 w-4 text-yusiop-primary" />}
            label="Ingreso bruto"
          >
            {formatEUR(grossXAF, 'left')}
          </KpiCard>
          <KpiCard
            icon={<UsersIcon className="h-4 w-4 text-yusiop-primary" />}
            label={`Artistas (${artistShare}%)`}
          >
            {formatEUR(artistXAF, 'left')}
          </KpiCard>
          <KpiCard
            icon={<TrendingUp className="h-4 w-4 text-yusiop-primary" />}
            label={`Plataforma (${platformShare}%)`}
          >
            {formatEUR(platformXAF, 'left')}
          </KpiCard>
        </div>

        {/* Tabla de referencia */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Descargas</th>
                <th className="text-right px-3 py-2 font-medium">Bruto</th>
                <th className="text-right px-3 py-2 font-medium">Artistas</th>
                <th className="text-right px-3 py-2 font-medium">Plataforma</th>
              </tr>
            </thead>
            <tbody>
              {DOWNLOAD_PRESETS.map((n) => {
                const g = valuePerDl * n;
                const a = g * (artistShare / 100);
                const p = g * (platformShare / 100);
                return (
                  <tr key={n} className="border-t">
                    <td className="px-3 py-2 tabular-nums">{n.toLocaleString('es-ES')}</td>
                    <td className="px-3 py-2 text-right">{formatEUR(g)}</td>
                    <td className="px-3 py-2 text-right">{formatEUR(a)}</td>
                    <td className="px-3 py-2 text-right">{formatEUR(p)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          * El valor por descarga sale de dividir los ingresos brutos totales entre las
          descargas habilitadas configuradas arriba. Los costes de producción de tarjetas
          físicas no se descuentan aquí porque dependen del nº de tarjetas vendidas, no de
          las descargas consumidas.
        </p>
      </CardContent>
    </Card>
  );
};

export default SalesSimulator;
