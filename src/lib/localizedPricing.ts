// Formateo de precios localizado.
// Toda la app sigue almacenando precios en EUR (o XAF para tarjetas físicas).
// Este helper convierte EUR → moneda preferida del usuario usando la tasa
// configurada en `country_settings` por el admin.

import { useLocaleStore } from '@/stores/localeStore';
import { XAF_PER_EUR, formatEURNumber, formatXAFFixed } from '@/lib/currency';

export interface FormatOptions {
  showOriginalEur?: boolean; // muestra "X € · Y XAF" estilo antiguo
}

export function formatPriceFromEur(eur: number, opts: FormatOptions = {}): string {
  const { currencyCode, currentCountry } = useLocaleStore.getState();

  // Sin localización aún: comportamiento histórico (EUR + XAF)
  if (!currencyCode || !currentCountry) {
    return `${formatEURNumber(eur)} · ${formatXAFFixed(eur * XAF_PER_EUR)}`;
  }

  if (currencyCode === 'EUR') {
    return formatEURNumber(eur);
  }

  const local = eur * Number(currentCountry.eur_to_currency_rate || 1);
  const decimals = currentCountry.decimals ?? 0;
  const symbol = currentCountry.currency_symbol || currencyCode;

  const formatted = local.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const main = `${formatted} ${symbol}`;
  if (opts.showOriginalEur && currencyCode !== 'EUR') {
    return `${main} · ${formatEURNumber(eur)}`;
  }
  return main;
}

// Para importes ya expresados en XAF (tarjetas físicas)
export function formatPriceFromXaf(xaf: number, opts: FormatOptions = {}): string {
  const eurEquivalent = xaf / XAF_PER_EUR;
  const { currencyCode } = useLocaleStore.getState();

  // Si la moneda del usuario es XAF (o no hay locale), mostramos directamente XAF
  if (!currencyCode || currencyCode === 'XAF' || currencyCode === 'XOF') {
    return formatXAFFixed(xaf);
  }
  return formatPriceFromEur(eurEquivalent, opts);
}
