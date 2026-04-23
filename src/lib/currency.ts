// Conversión fija EUR ⇄ XAF (Franco CFA - paridad oficial)
export const XAF_PER_EUR = 655.957;

export const eurToXaf = (eur: number): number => Math.round(eur * XAF_PER_EUR);

export const formatEURNumber = (eur: number): string =>
  `${eur.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;

export const formatXAFNumber = (eur: number): string =>
  `${eurToXaf(eur).toLocaleString('es-ES')} XAF`;

// "4,99 € · 3.273 XAF" — para usar en una sola línea (botones, badges)
export const formatEURWithXAFInline = (eur: number): string =>
  `${formatEURNumber(eur)} · ${formatXAFNumber(eur)}`;

// Formatear un importe ya expresado en XAF (sin conversión)
export const formatXAFFixed = (xaf: number): string =>
  `${Math.round(xaf).toLocaleString('es-ES')} XAF`;

// Convertir un importe en EUR a XAF y devolverlo como string ya formateado
export const eurToXafString = (eur: number): string => formatXAFFixed(eurToXaf(eur));

// Precios fijos de tarjetas FÍSICAS (vendidas en XAF)
export const PHYSICAL_STANDARD_PRICE_XAF = 3000;
export const PHYSICAL_PREMIUM_PRICE_XAF = 7000;
