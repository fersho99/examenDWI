export const CANDLE_INTERVALS = ["5m", "1h", "1d"] as const;
export type CandleInterval = (typeof CANDLE_INTERVALS)[number];

export const INTERVAL_MS: Record<CandleInterval, number> = {
  "5m": 5 * 60_000,
  "1h": 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

/** Cuánto se conserva de cada intervalo. null significa sin límite. */
export const RETENTION_MS: Record<CandleInterval, number | null> = {
  "5m": 8 * INTERVAL_MS["1d"],
  "1h": 120 * INTERVAL_MS["1d"],
  "1d": null,
};
