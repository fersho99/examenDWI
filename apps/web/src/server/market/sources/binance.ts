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

export async function fetchKlines(
  symbol: string,
  interval: CandleInterval,
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
