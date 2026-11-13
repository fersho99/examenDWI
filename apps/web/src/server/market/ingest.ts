import { CANDLE_INTERVALS, INTERVAL_MS, RETENTION_MS, type CandleInterval } from "@bloque21/shared";
import { and, eq, isNotNull, lt, max, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { candles, coins, sourceHealth } from "../db/schema";
import { SourceError } from "./source-error";
import { MAX_KLINES, fetchKlines, type Candle } from "./sources/binance";

export interface IngestSummary {
  coins: number;
  candlesWritten: number;
  failures: { coinId: string; interval: CandleInterval; message: string }[];
  rateLimited: boolean;
  durationMs: number;
}

/**
 * Cuántas velas pedir: las que faltan desde la última guardada, más la vela en curso.
 * Sin historial se hace un respaldo completo.
 */
export function klinesToRequest(latest: Date | null, interval: CandleInterval, now: Date) {
  if (!latest) return MAX_KLINES;
  const missing = Math.ceil((now.getTime() - latest.getTime()) / INTERVAL_MS[interval]);
  return Math.min(MAX_KLINES, Math.max(2, missing + 1));
}

type FetchKlines = typeof fetchKlines;

export async function runIngest(
  db: Db,
  { now = new Date(), fetchCandles = fetchKlines }: { now?: Date; fetchCandles?: FetchKlines } = {},
): Promise<IngestSummary> {
  const started = Date.now();

  const activeCoins = await db
    .select({ id: coins.id, binanceSymbol: coins.binanceSymbol })
    .from(coins)
    .where(and(eq(coins.active, true), isNotNull(coins.binanceSymbol)));

  const latestRows = await db
    .select({ coinId: candles.coinId, interval: candles.interval, latest: max(candles.openTime) })
    .from(candles)
    .groupBy(candles.coinId, candles.interval);
  const latestByKey = new Map(latestRows.map((row) => [`${row.coinId}:${row.interval}`, row.latest]));

  const summary: IngestSummary = {
    coins: activeCoins.length,
    candlesWritten: 0,
    failures: [],
    rateLimited: false,
    durationMs: 0,
  };

  for (const interval of CANDLE_INTERVALS) {
    if (summary.rateLimited) break;

    const results = await Promise.allSettled(
      activeCoins.map(async (coin) => {
        const limit = klinesToRequest(latestByKey.get(`${coin.id}:${interval}`) ?? null, interval, now);
        const fetched = await fetchCandles(coin.binanceSymbol!, interval, limit);
        await upsertCandles(db, coin.id, interval, fetched, now);
        return fetched.length;
      }),
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        summary.candlesWritten += result.value;
        return;
      }
      const error = result.reason;
      if (error instanceof SourceError && error.isRateLimited) summary.rateLimited = true;
      summary.failures.push({
        coinId: activeCoins[index]!.id,
        interval,
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }

  await applyRetention(db, now);
  await recordHealth(db, summary, now);

  summary.durationMs = Date.now() - started;
  return summary;
}

async function upsertCandles(db: Db, coinId: string, interval: CandleInterval, rows: Candle[], now: Date) {
  if (rows.length === 0) return;
  await db
    .insert(candles)
    .values(rows.map((row) => ({ ...row, coinId, interval, source: "binance", ingestedAt: now })))
    .onConflictDoUpdate({
      target: [candles.coinId, candles.interval, candles.openTime],
      set: {
        open: sql`excluded.open`,
        high: sql`excluded.high`,
        low: sql`excluded.low`,
        close: sql`excluded.close`,
        volume: sql`excluded.volume`,
        source: sql`excluded.source`,
        ingestedAt: sql`excluded.ingested_at`,
      },
    });
}

async function applyRetention(db: Db, now: Date) {
  for (const interval of CANDLE_INTERVALS) {
    const keep = RETENTION_MS[interval];
    if (keep === null) continue;
    await db
      .delete(candles)
      .where(and(eq(candles.interval, interval), lt(candles.openTime, new Date(now.getTime() - keep))));
  }
}

async function recordHealth(db: Db, summary: IngestSummary, now: Date) {
  const failedEverything = summary.coins > 0 && summary.candlesWritten === 0 && summary.failures.length > 0;
  const lastError = summary.failures[0]?.message ?? null;

  await db
    .insert(sourceHealth)
    .values({
      source: "binance",
      lastOkAt: failedEverything ? null : now,
      lastErrorAt: lastError ? now : null,
      lastError,
      consecutiveFailures: failedEverything ? 1 : 0,
    })
    .onConflictDoUpdate({
      target: sourceHealth.source,
      set: failedEverything
        ? {
            lastErrorAt: now,
            lastError,
            consecutiveFailures: sql`${sourceHealth.consecutiveFailures} + 1`,
          }
        : {
            lastOkAt: now,
            consecutiveFailures: 0,
            ...(lastError ? { lastErrorAt: now, lastError } : {}),
          },
    });
}
