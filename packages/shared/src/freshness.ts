/**
 * Un precio deja de considerarse fresco después de este tiempo.
 * Mientras la ingesta corra cada 15 min, el margen es de 20 min; se reduce
 * cuando exista el ciclo de 1 min.
 */
export const PRICE_STALE_AFTER_MS = 20 * 60_000;

export function isStale(asOf: Date | string, now: Date, maxAgeMs = PRICE_STALE_AFTER_MS) {
  return now.getTime() - new Date(asOf).getTime() > maxAgeMs;
}
