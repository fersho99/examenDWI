"use client";

import {
  DISPLAY_CURRENCIES,
  FxResponseSchema,
  PricesResponseSchema,
  formatMoney,
  type DisplayCurrency,
  type Price,
} from "@bloque21/shared";
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import { useLocalState } from "@/lib/local-store";

const REFRESH_MS = 30_000;
const CurrencySchema = z.enum(DISPLAY_CURRENCIES);

interface Market {
  prices: Price[];
  pricesById: ReadonlyMap<string, Price>;
  /** Pesos por dólar; null mientras no llega o si Binance no responde. */
  usdMxn: number | null;
  fxAsOf: string | null;
  offline: boolean;
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
  /** Convierte un monto en USD a la moneda elegida; sin tipo de cambio, se queda en USD. */
  toDisplay: (usd: number) => { amount: number; currency: DisplayCurrency };
  money: (usd: number) => string;
  /** Convierte un monto en la moneda elegida a USD (para guardar). */
  fromDisplay: (amount: number) => number | null;
}

const MarketContext = createContext<Market | null>(null);

export function useMarket() {
  const market = use(MarketContext);
  if (!market) throw new Error("useMarket necesita MarketProvider");
  return market;
}

/** Un solo ciclo de precios y tipo de cambio para todas las pantallas de la app. */
export function MarketProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<Price[]>([]);
  const [fx, setFx] = useState<{ usdMxn: number; asOf: string } | null>(null);
  const [offline, setOffline] = useState(false);
  const [currency, setCurrency] = useLocalState("bloque21.currency", CurrencySchema, "MXN");

  useEffect(() => {
    let active = true;
    async function refresh() {
      if (document.hidden) return;
      const [pricesResult, fxResult] = await Promise.allSettled([
        fetch("/api/v1/prices", { cache: "no-store" }).then(async (response) => {
          if (!response.ok) throw new Error(String(response.status));
          return PricesResponseSchema.parse(await response.json()).data.prices;
        }),
        fetch("/api/v1/fx", { cache: "no-store" }).then(async (response) => {
          if (!response.ok) throw new Error(String(response.status));
          return FxResponseSchema.parse(await response.json()).data;
        }),
      ]);
      if (!active) return;
      if (pricesResult.status === "fulfilled") setPrices(pricesResult.value);
      if (fxResult.status === "fulfilled") setFx({ usdMxn: fxResult.value.usdMxn, asOf: fxResult.value.asOf });
      setOffline(pricesResult.status === "rejected");
    }
    void refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const usdMxn = fx?.usdMxn ?? null;

  const toDisplay = useCallback(
    (usd: number) =>
      currency === "MXN" && usdMxn !== null
        ? { amount: usd * usdMxn, currency: "MXN" as const }
        : { amount: usd, currency: "USD" as const },
    [currency, usdMxn],
  );

  const value = useMemo<Market>(
    () => ({
      prices,
      pricesById: new Map(prices.map((price) => [price.coinId, price])),
      usdMxn,
      fxAsOf: fx?.asOf ?? null,
      offline,
      currency,
      setCurrency,
      toDisplay,
      money: (usd) => {
        const shown = toDisplay(usd);
        return formatMoney(shown.amount, shown.currency);
      },
      fromDisplay: (amount) => (currency === "MXN" ? (usdMxn === null ? null : amount / usdMxn) : amount),
    }),
    [prices, usdMxn, fx?.asOf, offline, currency, setCurrency, toDisplay],
  );

  return <MarketContext value={value}>{children}</MarketContext>;
}

/** Selector MXN / USD; siempre visible para que el símbolo $ no sea ambiguo. */
export function CurrencySwitch() {
  const { currency, setCurrency, usdMxn } = useMarket();
  return (
    <div role="group" aria-label="Moneda para mostrar precios" className="inline-flex rounded-full bg-panel p-1">
      {DISPLAY_CURRENCIES.map((option) => {
        const active = option === currency;
        const disabled = option === "MXN" && usdMxn === null;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => setCurrency(option)}
            className={`min-h-10 min-w-14 rounded-full px-3 text-sm font-medium transition-colors duration-150 disabled:opacity-40 ${active ? "bg-btc text-ink" : "text-sand hover:text-cream"}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
