import { INTERVAL_MS, isStale, type Price } from "@bloque21/shared";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";

const RowSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  close: z.coerce.number().positive(),
  open_time: z.coerce.date(),
  ingested_at: z.coerce.date(),
  close_24h: z.coerce.number().positive().nullable(),
});

/**
 * Hora real del dato: en una vela cerrada es su cierre; en la vela en curso, el momento
 * en que se leyó el precio. Nunca la hora de la respuesta.
 */
export function priceAsOf(openTime: Date, ingestedAt: Date) {
  const closeTime = openTime.getTime() + INTERVAL_MS["5m"];
  return new Date(Math.min(closeTime, ingestedAt.getTime()));
}

export function change24h(close: number, close24h: number | null) {
  return close24h === null ? null : (close / close24h - 1) * 100;
}

/** Último precio de cada moneda activa a partir de las velas de 5 min guardadas en Neon. */
export async function getLatestPrices(db: Db, ids?: string[], now = new Date()): Promise<Price[]> {
  const filter = ids?.length
    ? sql`and c.id in (${sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `,
      )})`
    : sql``;

  const result = await db.execute(sql`
    select c.id, c.symbol, c.name, l.close, l.open_time, l.ingested_at, d.close as close_24h
    from coins c
    join lateral (
      select close, open_time, ingested_at from candles
      where coin_id = c.id and interval = '5m'
      order by open_time desc limit 1
    ) l on true
    left join lateral (
      select close from candles
      where coin_id = c.id and interval = '5m'
        and open_time <= l.open_time - interval '24 hours'
        and open_time > l.open_time - interval '25 hours'
      order by open_time desc limit 1
    ) d on true
    where c.active ${filter}
    order by c.sort_order, c.id
  `);

  return z
    .array(RowSchema)
    .parse(result.rows)
    .map((row) => {
      const asOf = priceAsOf(row.open_time, row.ingested_at);
      return {
        coinId: row.id,
        symbol: row.symbol,
        name: row.name,
        priceUsd: row.close,
        change24hPct: change24h(row.close, row.close_24h),
        asOf: asOf.toISOString(),
        source: "binance" as const,
        stale: isStale(asOf, now),
      };
    });
}
