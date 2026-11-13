"use client";

import {
  ChartResponseSchema,
  FxResponseSchema,
  INITIAL_COINS,
  PricesResponseSchema,
  isStale,
  type ChartDays,
  type Price,
} from "@bloque21/shared";
import { fetchKlines, fetchTickers, type BinanceInterval } from "@/server/market/sources/binance";

/**
 * De dónde lee precios el cliente.
 * - server: la API propia (/api/v1), con Neon detrás.
 * - direct: Binance desde el propio teléfono. La usa la APK independiente, que no tiene servidor.
 */
export const DIRECT = process.env.NEXT_PUBLIC_DATA_MODE === "direct";

export type ChartPoint = [number, number];

async function json(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} respondió ${response.status}`);
  return response.json() as Promise<unknown>;
}

export async function fetchPrices(now = new Date()): Promise<Price[]> {
  if (!DIRECT) return PricesResponseSchema.parse(await json("/api/v1/prices")).data.prices;

  const tickers = await fetchTickers(INITIAL_COINS.map((coin) => coin.binanceSymbol));
  const bySymbol = new Map(tickers.map((ticker) => [ticker.symbol, ticker]));
  return INITIAL_COINS.flatMap((coin) => {
    const ticker = bySymbol.get(coin.binanceSymbol);
    if (!ticker) return [];
    const asOf = new Date(Math.min(ticker.closeTime.getTime(), now.getTime()));
    return [
      {
        coinId: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        priceUsd: ticker.lastPrice,
        change24hPct: ticker.change24hPct,
        asOf: asOf.toISOString(),
        source: "binance" as const,
        stale: isStale(asOf, now),
      },
    ];
  });
}

export async function fetchFx(): Promise<{ usdMxn: number; asOf: string }> {
  if (!DIRECT) {
    const { data } = FxResponseSchema.parse(await json("/api/v1/fx"));
    return { usdMxn: data.usdMxn, asOf: data.asOf };
  }
  const [ticker] = await fetchTickers(["USDTMXN"]);
  if (!ticker) throw new Error("Binance no devolvió USDT/MXN");
  return { usdMxn: ticker.lastPrice, asOf: new Date(Math.min(ticker.closeTime.getTime(), Date.now())).toISOString() };
}

/** Mismos rangos que la gráfica del servidor cuando lee Binance directo. */
const RANGES: Record<ChartDays, { interval: BinanceInterval; limit: number }> = {
  "1": { interval: "5m", limit: 288 },
  "7": { interval: "1h", limit: 168 },
  "30": { interval: "4h", limit: 180 },
  "90": { interval: "12h", limit: 180 },
  "365": { interval: "1d", limit: 365 },
};

export async function fetchChart(coinId: string, days: ChartDays, signal?: AbortSignal): Promise<ChartPoint[]> {
  if (!DIRECT) {
    const response = await fetch(`/api/v1/coins/${coinId}/chart?days=${days}`, { signal });
    if (!response.ok) throw new Error(String(response.status));
    return ChartResponseSchema.parse(await response.json()).data.points;
  }
  const coin = INITIAL_COINS.find((item) => item.id === coinId);
  if (!coin) throw new Error(`Moneda desconocida: ${coinId}`);
  const { interval, limit } = RANGES[days];
  const fetcher: typeof fetch = (input, init) => fetch(input, { ...init, signal: signal ?? init?.signal ?? null });
  const candles = await fetchKlines(coin.binanceSymbol, interval, limit, fetcher);
  return candles.map((candle): ChartPoint => [candle.openTime.getTime(), candle.close]);
}
