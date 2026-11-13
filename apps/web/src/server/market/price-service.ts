import { INITIAL_COINS, isStale, type Price, type PricesResponse } from "@bloque21/shared";
import { getDb } from "../db/client";
import { getLatestPrices } from "./prices";
import { fetchTickers } from "./sources/binance";

type ServedFrom = PricesResponse["meta"]["servedFrom"];

/** Precios en vivo de Binance para las monedas conocidas; respaldo cuando Neon no responde. */
export async function getLivePrices(ids?: string[], now = new Date()): Promise<Price[]> {
  const coins = INITIAL_COINS.filter((coin) => !ids || ids.includes(coin.id));
  if (coins.length === 0) return [];
  const tickers = await fetchTickers(coins.map((coin) => coin.binanceSymbol));
  const bySymbol = new Map(tickers.map((ticker) => [ticker.symbol, ticker]));

  return coins.flatMap((coin) => {
    const ticker = bySymbol.get(coin.binanceSymbol);
    if (!ticker) return [];
    // closeTime es el fin de la ventana de 24 h: nunca después de ahora.
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

/**
 * Primero Neon; si falla o no está configurado, Binance directo.
 * Si ambas fallan se propaga el error y la ruta responde 503.
 */
export async function loadPrices(ids?: string[]): Promise<{ prices: Price[]; servedFrom: ServedFrom }> {
  if (process.env.DATABASE_URL) {
    try {
      const prices = await getLatestPrices(getDb(), ids);
      if (prices.length > 0) return { prices, servedFrom: "database" };
    } catch (error) {
      console.error("precios: Neon no respondió, se usa Binance directo", error);
    }
  }
  return { prices: await getLivePrices(ids), servedFrom: "live" };
}
