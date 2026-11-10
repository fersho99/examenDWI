import { INITIAL_COINS } from "@bloque21/shared";
import { sql } from "drizzle-orm";
import { getDb } from "./client";
import { coins } from "./schema";

/** Registra las monedas iniciales. Se puede ejecutar varias veces. */
async function seed() {
  const db = getDb();
  await db
    .insert(coins)
    .values(
      INITIAL_COINS.map((coin, index) => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        binanceSymbol: coin.binanceSymbol,
        tint: coin.tint,
        sortOrder: index,
      })),
    )
    .onConflictDoUpdate({
      target: coins.id,
      set: {
        symbol: sql`excluded.symbol`,
        name: sql`excluded.name`,
        binanceSymbol: sql`excluded.binance_symbol`,
        tint: sql`excluded.tint`,
        sortOrder: sql`excluded.sort_order`,
      },
    });
  console.log(`Monedas registradas: ${INITIAL_COINS.length}`);
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
