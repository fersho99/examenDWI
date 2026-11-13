export const CHART_RANGES = [
  { value: "1", label: "24H" },
  { value: "7", label: "7D" },
  { value: "30", label: "30D" },
  { value: "90", label: "90D" },
  { value: "365", label: "1A" },
] as const;

export type ChartRange = (typeof CHART_RANGES)[number]["value"];

/** Par [marca de tiempo en ms, precio en USD]. */
export type ChartPoint = [number, number];

/** Métricas de actualización lenta. Pueden faltar si la API limita las consultas. */
export interface MarketDetails {
  marketCapUsd: number;
  volumeUsd: number;
  mxnPerUsd: number;
  eurPerUsd: number;
  change7d: number;
  change30d: number;
  change1y: number;
  circulatingSupply: number;
  maxSupply: number;
  athUsd: number;
  athChange: number;
  athDate: string;
}

export interface Market {
  priceUsd: number;
  change24h: number;
  high24h: number;
  low24h: number;
  updatedAt: number;
  /** Verdadero cuando la API falló y se sirve el último precio conocido. */
  stale: boolean;
  details: MarketDetails | null;
}

export interface Sentiment {
  value: number;
  label: string;
}

export interface MarketResponse {
  market: Market;
  sentiment: Sentiment | null;
}

export function isChartRange(value: string | null): value is ChartRange {
  return CHART_RANGES.some((range) => range.value === value);
}
