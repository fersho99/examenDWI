import { INITIAL_COINS, type CandleInterval, type ChartDays } from "@bloque21/shared";
import { and, asc, eq, gte } from "drizzle-orm";
import type { Db } from "../db/client";
import { getDb } from "../db/client";
import { candles } from "../db/schema";
import { fetchKlines, type BinanceInterval } from "./sources/binance";

type Point = [number, number];

/**
 * Qué intervalo guardado sirve cada rango y cada cuántas velas tomar una
 * (30 días en 1 h cada 4 velas equivale a velas de 4 h).
 */
const FROM_DATABASE: Record<ChartDays, { interval: CandleInterval; every: number }> = {
  "1": { interval: "5m", every: 1 },
  "7": { interval: "1h", every: 1 },
  "30": { interval: "1h", every: 4 },
  "90": { interval: "1h", every: 12 },
  "365": { interval: "1d", every: 1 },
};

/** Respaldo en vivo: mismos rangos que el sitio actual. */
const FROM_BINANCE: Record<ChartDays, { interval: BinanceInterval; limit: number }> = {
  "1": { interval: "5m", limit: 288 },
  "7": { interval: "1h", limit: 168 },
  "30": { interval: "4h", limit: 180 },
  "90": { interval: "12h", limit: 180 },
  "365": { interval: "1d", limit: 365 },
};

/** Toma una de cada `every` velas, siempre conservando la última. */
export function downsample(points: Point[], every: number): Point[] {
  if (every <= 1 || points.length === 0) return points;
  const kept = points.filter((_, index) => (points.length - 1 - index) % every === 0);
  return kept;
}

export async function getChartFromDatabase(db: Db, coinId: string, days: ChartDays, now = new Date()) {
  const { interval, every } = FROM_DATABASE[days];
  const since = new Date(now.getTime() - Number(days) * 24 * 60 * 60_000);
  const rows = await db
    .select({ openTime: candles.openTime, close: candles.close })
    .from(candles)
    .where(and(eq(candles.coinId, coinId), eq(candles.interval, interval), gte(candles.openTime, since)))
    .orderBy(asc(candles.openTime));
  return downsample(
    rows.map((row): Point => [row.openTime.getTime(), row.close]),
    every,
  );
}

async function getChartLive(coinId: string, days: ChartDays): Promise<Point[]> {
  const coin = INITIAL_COINS.find((item) => item.id === coinId);
  if (!coin) return [];
  const { interval, limit } = FROM_BINANCE[days];
  const rows = await fetchKlines(coin.binanceSymbol, interval, limit);
  return rows.map((row): Point => [row.openTime.getTime(), row.close]);
}

/** Primero Neon (necesita al menos 2 puntos); si no, Binance directo. */
export async function loadChart(coinId: string, days: ChartDays) {
  if (process.env.DATABASE_URL) {
    try {
      const points = await getChartFromDatabase(getDb(), coinId, days);
      if (points.length >= 2) return { points, servedFrom: "database" as const };
    } catch (error) {
      console.error("gráfica: Neon no respondió, se usa Binance directo", error);
    }
  }
  return { points: await getChartLive(coinId, days), servedFrom: "live" as const };
}
