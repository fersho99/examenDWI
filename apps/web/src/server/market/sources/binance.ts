import type { CandleInterval } from "@bloque21/shared";
import { z } from "zod";
import { SourceError } from "../source-error";

const BASE_URL = "https://data-api.binance.vision/api/v3";
export const MAX_KLINES = 1000;

const numeric = z.string().regex(/^\d+(\.\d+)?$/).transform(Number);

// [openTime, open, high, low, close, volume, closeTime, ...]
const KlineSchema = z.tuple(
  [z.number().int(), numeric, numeric, numeric, numeric, numeric, z.number().int()],
  z.unknown(),
);
const KlinesSchema = z.array(KlineSchema);

export interface Candle {
  openTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function parseKlines(payload: unknown): Candle[] {
  return KlinesSchema.parse(payload).map(([openTime, open, high, low, close, volume]) => ({
    openTime: new Date(openTime),
    open,
    high,
    low,
    close,
    volume,
  }));
}

const TickerSchema = z.object({
  symbol: z.string(),
  lastPrice: numeric,
  priceChangePercent: z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number),
  closeTime: z.number().int(),
});

export interface Ticker {
  symbol: string;
  lastPrice: number;
  change24hPct: number;
  closeTime: Date;
}

export function parseTickers(payload: unknown): Ticker[] {
  return z
    .array(TickerSchema)
    .parse(payload)
    .map((row) => ({
      symbol: row.symbol,
      lastPrice: row.lastPrice,
      change24hPct: row.priceChangePercent,
      closeTime: new Date(row.closeTime),
    }));
}

/** Precio y variación de 24 h en vivo para varios pares en una llamada (peso 2 por par). */
export async function fetchTickers(symbols: string[], fetcher: typeof fetch = fetch): Promise<Ticker[]> {
  const url = new URL(`${BASE_URL}/ticker/24hr`);
  url.searchParams.set("symbols", JSON.stringify(symbols));
  url.searchParams.set("type", "FULL");
  const response = await fetcher(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  }).catch((cause: unknown) => {
    throw new SourceError("binance", "Sin respuesta de Binance", { cause });
  });
  if (!response.ok) {
    throw new SourceError("binance", `Binance respondió ${response.status}`, {
      status: response.status,
      retryAfterSec: Number(response.headers.get("retry-after")) || undefined,
    });
  }
  return parseTickers(await response.json());
}

/** Pesos por dólar con el par USDT/MXN (USDT sigue al dólar). */
export async function fetchUsdMxn(fetcher: typeof fetch = fetch): Promise<{ rate: number; asOf: Date }> {
  const [ticker] = await fetchTickers(["USDTMXN"], fetcher);
  if (!ticker) throw new SourceError("binance", "Binance no devolvió USDT/MXN");
  return { rate: ticker.lastPrice, asOf: new Date(Math.min(ticker.closeTime.getTime(), Date.now())) };
}

/** Intervalos de Binance que usa la app: los guardados más los agregados de la gráfica en vivo. */
export type BinanceInterval = CandleInterval | "4h" | "12h";

export async function fetchKlines(
  symbol: string,
  interval: BinanceInterval,
  limit: number,
  fetcher: typeof fetch = fetch,
): Promise<Candle[]> {
  const url = new URL(`${BASE_URL}/klines`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), MAX_KLINES)));

  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch (cause) {
    throw new SourceError("binance", `Sin respuesta de Binance para ${symbol}`, { cause });
  }

  if (!response.ok) {
    // 429 y 418 traen Retry-After; insistir tras un 429 termina en bloqueo de IP.
    const retryAfter = Number(response.headers.get("retry-after")) || undefined;
    throw new SourceError("binance", `Binance respondió ${response.status} para ${symbol}`, {
      status: response.status,
      retryAfterSec: retryAfter,
    });
  }

  try {
    return parseKlines(await response.json());
  } catch (cause) {
    throw new SourceError("binance", `Respuesta inesperada de Binance para ${symbol}`, { cause });
  }
}
