import { CANDLE_INTERVALS } from "@bloque21/shared";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const candleInterval = pgEnum("candle_interval", CANDLE_INTERVALS);

export const coins = pgTable(
  "coins",
  {
    id: text("id").primaryKey(),
    symbol: text("symbol").notNull(),
    name: text("name").notNull(),
    binanceSymbol: text("binance_symbol"),
    tint: text("tint").notNull(),
    sortOrder: smallint("sort_order").notNull().default(100),
    active: boolean("active").notNull().default(true),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [index("coins_symbol_idx").on(table.symbol)],
);

export const candles = pgTable(
  "candles",
  {
    coinId: text("coin_id")
      .notNull()
      .references(() => coins.id, { onDelete: "cascade" }),
    interval: candleInterval("interval").notNull(),
    openTime: timestamptz("open_time").notNull(),
    open: doublePrecision("open").notNull(),
    high: doublePrecision("high").notNull(),
    low: doublePrecision("low").notNull(),
    close: doublePrecision("close").notNull(),
    volume: doublePrecision("volume").notNull(),
    source: text("source").notNull(),
    /** Cuándo se guardó: en la vela en curso es la hora real del último precio. */
    ingestedAt: timestamptz("ingested_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.coinId, table.interval, table.openTime] })],
);

export const sourceHealth = pgTable("source_health", {
  source: text("source").primaryKey(),
  lastOkAt: timestamptz("last_ok_at"),
  lastErrorAt: timestamptz("last_error_at"),
  lastError: text("last_error"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
});
