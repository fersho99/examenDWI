"use client";

import { INITIAL_COINS, formatMoney, formatQuantity } from "@bloque21/shared";
import { useState } from "react";
import { Freshness } from "../freshness";
import { useMarket } from "../market-context";
import { CoinSelect, FIELD, ScreenTitle, Segmented, parseAmount } from "../ui";

type Direction = "crypto" | "mxn" | "usd";

const DIRECTIONS = [
  { value: "crypto", label: "Cripto" },
  { value: "mxn", label: "Pesos" },
  { value: "usd", label: "Dólares" },
] as const;

export function ConverterScreen() {
  const market = useMarket();
  const [coinId, setCoinId] = useState<string>(INITIAL_COINS[0].id);
  const [direction, setDirection] = useState<Direction>("mxn");
  const [raw, setRaw] = useState("1000");

  const coin = INITIAL_COINS.find((item) => item.id === coinId)!;
  const quote = market.pricesById.get(coinId);
  const amount = parseAmount(raw);
  const fx = market.usdMxn;

  let result: { primary: string; secondary: string | null } | null = null;
  if (quote && amount !== null) {
    if (direction === "crypto") {
      const usd = amount * quote.priceUsd;
      result = {
        primary: fx !== null ? `${formatMoney(usd * fx, "MXN", 2)} MXN` : `${formatMoney(usd, "USD", 2)} USD`,
        secondary: fx !== null ? `${formatMoney(usd, "USD", 2)} USD` : null,
      };
    } else if (direction === "usd" || fx !== null) {
      const usd = direction === "usd" ? amount : amount / fx!;
      result = {
        primary: `${formatQuantity(usd / quote.priceUsd)} ${coin.symbol}`,
        secondary:
          direction === "mxn" ? `Equivale a ${formatMoney(usd, "USD", 2)} USD` : fx !== null ? `Equivale a ${formatMoney(usd * fx, "MXN", 2)} MXN` : null,
      };
    }
  }

  const unit = direction === "crypto" ? coin.symbol : direction === "mxn" ? "pesos" : "dólares";

  return (
    <div className="space-y-8">
      <ScreenTitle>Convertir</ScreenTitle>

      <div className="rise space-y-5">
        <Segmented label="Tengo" value={direction} onChange={setDirection} options={DIRECTIONS} />
        <label className="block text-sm font-medium">
          Cantidad en {unit}
          <input inputMode="decimal" value={raw} onChange={(event) => setRaw(event.target.value)} className={FIELD} />
        </label>
        <CoinSelect value={coinId} onChange={setCoinId} label={direction === "crypto" ? "Moneda" : "Quiero comprar"} />
      </div>

      <section aria-live="polite" aria-labelledby="result-title" className="rise">
        <h2 id="result-title" className="text-sand">
          {direction === "crypto" ? "Vale" : "Te alcanza para"}
        </h2>
        {result ? (
          <>
            <p className="mt-1 font-display text-4xl font-semibold tracking-tight tabular-nums break-words">
              {result.primary}
            </p>
            {result.secondary && <p className="mt-1 text-sand tabular-nums">{result.secondary}</p>}
          </>
        ) : (
          <p className="mt-1 text-sand">
            {amount === null ? "Escribe una cantidad mayor a cero." : "Esperando precios y tipo de cambio…"}
          </p>
        )}
      </section>

      {quote && (
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-dust">1 {coin.symbol}</dt>
            <dd className="tabular-nums">
              {formatMoney(quote.priceUsd, "USD")} USD
              {fx !== null && ` o ${formatMoney(quote.priceUsd * fx, "MXN")} MXN`}
            </dd>
          </div>
          {fx !== null && (
            <div className="flex justify-between gap-4">
              <dt className="text-dust">1 dólar</dt>
              <dd className="tabular-nums">{fx.toFixed(4)} pesos</dd>
            </div>
          )}
          <div className="pt-2 text-dust">
            <Freshness asOf={quote.asOf} stale={quote.stale} />. Tipo de cambio del par USDT/MXN de Binance.
          </div>
        </dl>
      )}
    </div>
  );
}
