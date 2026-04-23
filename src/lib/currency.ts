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
