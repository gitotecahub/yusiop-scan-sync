// Utilidades para trabajar con la zona horaria Europe/Madrid
// (lanzamientos siempre a las 00:00 hora peninsular española)

/**
 * Convierte una fecha YYYY-MM-DD + hora HH:MM (interpretadas en Europe/Madrid)
 * a un ISO string UTC apto para enviar a la base de datos.
 */
export function madridLocalToUtcIso(dateYmd: string, timeHm: string = '00:00'): string {
  // Construir la fecha "tal cual" como si fuera UTC
  const [y, m, d] = dateYmd.split('-').map(Number);
  const [hh, mm] = timeHm.split(':').map(Number);
  const asUtc = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0);

  // Calcular el offset que tendría Madrid en ese instante.
  // Truco: formatear el instante UTC con la zona Madrid y comparar.
  const madridStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(asUtc));

  const part = (t: string) => Number(madridStr.find((p) => p.type === t)?.value ?? '0');
  const madridAsUtc = Date.UTC(
    part('year'), part('month') - 1, part('day'),
    part('hour') === 24 ? 0 : part('hour'),
    part('minute'), part('second'),
  );
  const offsetMs = madridAsUtc - asUtc; // cuánto adelanta Madrid respecto a UTC en ese momento

  // Si "asUtc" es 23/04 00:00 UTC y Madrid muestra 02:00 UTC equivalente -> offset = +2h.
  // El instante real en UTC para "23/04 00:00 Madrid" = asUtc - offset
  return new Date(asUtc - offsetMs).toISOString();
}

/** Formatea un ISO string como fecha+hora en Madrid */
export function formatMadrid(iso: string, withTime = true): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(d);
}

/** Devuelve "en 2d 4h", "en 35min" o "ya disponible" */
export function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'ya disponible';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `en ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `en ${hours}h ${mins % 60}min`;
  const days = Math.floor(hours / 24);
  return `en ${days}d ${hours % 24}h`;
}
