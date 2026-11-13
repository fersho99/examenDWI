import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { INITIAL_COINS } from "@bloque21/shared";
import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../db/client";
import * as schema from "../db/schema";
import { runIngest } from "./ingest";
import { getLatestPrices } from "./prices";
import { SourceError } from "./source-error";
import type { Candle } from "./sources/binance";

// Postgres real en memoria con la misma migración que se aplica en Neon.
const migration = readFileSync(new URL("../../../drizzle/0000_inicial.sql", import.meta.url), "utf8");

const NOW = new Date("2026-11-10T18:02:00Z");
const FIVE_MIN = 5 * 60_000;

/** Velas de 5 min con precio creciente; la última es la vela en curso. */
function fakeCandles(count: number, startPrice: number, end = NOW): Candle[] {
  const lastOpen = Math.floor(end.getTime() / FIVE_MIN) * FIVE_MIN;
  return Array.from({ length: count }, (_, i) => {
    const close = startPrice + i;
    return {
      openTime: new Date(lastOpen - (count - 1 - i) * FIVE_MIN),
      open: close,
      high: close,
      low: close,
      close,
      volume: 1,
    };
  });
}

let db: Db;

beforeEach(async () => {
  const client = new PGlite();
  for (const statement of migration.split("--> statement-breakpoint")) {
    await client.exec(statement);
  }
  const pg = drizzle({ client, schema });
  await pg.insert(schema.coins).values(
    INITIAL_COINS.slice(0, 2).map((coin, index) => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      binanceSymbol: coin.binanceSymbol,
      tint: coin.tint,
      sortOrder: index,
    })),
  );
  // Misma API de consulta que neon-http; solo cambia el transporte.
  db = pg as unknown as Db;
});

describe("ingesta y precios contra Postgres", () => {
  it("guarda velas y entrega el último precio con su hora real y la variación de 24 h", async () => {
    const summary = await runIngest(db, {
      now: NOW,
      fetchCandles: async (symbol, interval) =>
        interval === "5m" ? fakeCandles(300, symbol === "BTCUSDT" ? 70000 : 2000) : [],
    });

    expect(summary.failures).toEqual([]);
    expect(summary.candlesWritten).toBe(600);

    const prices = await getLatestPrices(db, undefined, NOW);
    expect(prices.map((price) => price.coinId)).toEqual(["bitcoin", "ethereum"]);

    const [btc] = prices;
    expect(btc?.priceUsd).toBe(70299);
    expect(btc?.asOf).toBe(NOW.toISOString());
    expect(btc?.stale).toBe(false);
    // 24 h = 288 velas antes: 70299 contra 70011.
    expect(btc?.change24hPct).toBeCloseTo((70299 / 70011 - 1) * 100, 6);
  });

  it("es idempotente: repetir la ingesta no duplica velas", async () => {
    const fetchCandles = async () => fakeCandles(10, 100);
    await runIngest(db, { now: NOW, fetchCandles });
    await runIngest(db, { now: NOW, fetchCandles });
    const rows = await db.select().from(schema.candles);
    expect(rows).toHaveLength(10 * 2 * 3);
  });

  it("filtra por ids y marca viejo un precio de hace una hora", async () => {
    const hourAgo = new Date(NOW.getTime() - 60 * 60_000);
    await runIngest(db, { now: hourAgo, fetchCandles: async () => fakeCandles(5, 100, hourAgo) });

    const prices = await getLatestPrices(db, ["ethereum"], NOW);
    expect(prices).toHaveLength(1);
    expect(prices[0]?.stale).toBe(true);
    expect(prices[0]?.change24hPct).toBeNull();
  });

  it("deja de pedir intervalos tras un 429 y lo registra en source_health", async () => {
    let calls = 0;
    const summary = await runIngest(db, {
      now: NOW,
      fetchCandles: async () => {
        calls += 1;
        throw new SourceError("binance", "Binance respondió 429", { status: 429, retryAfterSec: 60 });
      },
    });

    expect(summary.rateLimited).toBe(true);
    expect(calls).toBe(2);
    const [health] = await db.select().from(schema.sourceHealth);
    expect(health?.consecutiveFailures).toBe(1);
    expect(health?.lastOkAt).toBeNull();
  });

  it("borra velas de 5 min con más de 8 días", async () => {
    const old = new Date(NOW.getTime() - 9 * 24 * 60 * 60_000);
    await runIngest(db, { now: old, fetchCandles: async () => fakeCandles(3, 100, old) });
    await runIngest(db, { now: NOW, fetchCandles: async () => [] });
    const rows = await db.select().from(schema.candles);
    expect(rows.filter((row) => row.interval === "5m")).toHaveLength(0);
  });
});
