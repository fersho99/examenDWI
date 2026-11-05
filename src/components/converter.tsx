"use client";

import { useState } from "react";
import { formatFiat, formatNumber, type Fiat } from "@/lib/format";
import type { Market } from "@/lib/types";

const FIELD =
  "w-full min-w-0 rounded-xl border border-line bg-ink px-4 py-3 text-base text-cream transition-colors duration-150 focus:border-btc focus:outline-none";

function parseAmount(value: string) {
  const amount = Number(value.replace(",", "."));
  return value.trim() !== "" && Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function trimBtc(value: number) {
  return value.toFixed(8).replace(/\.?0+$/, "");
}

export function Converter({ market }: { market: Market }) {
  const [selectedCurrency, setCurrency] = useState<Fiat>("MXN");
  const [source, setSource] = useState<"btc" | "fiat">("btc");
  const [input, setInput] = useState("0.01");

  // Sin tipos de cambio disponibles, el conversor funciona solo en dólares.
  const { details } = market;
  const currency = details ? selectedCurrency : "USD";
  const rate =
    market.priceUsd *
    (currency === "MXN"
      ? (details?.mxnPerUsd ?? 1)
      : currency === "EUR"
        ? (details?.eurPerUsd ?? 1)
        : 1);

  const amount = parseAmount(input);
  const invalid = input.trim() !== "" && amount === null;

  const btcAmount = amount === null ? null : source === "btc" ? amount : amount / rate;
  const fiatAmount = amount === null ? null : source === "fiat" ? amount : amount * rate;

  const btcValue = source === "btc" ? input : btcAmount === null ? "" : trimBtc(btcAmount);
  const fiatValue = source === "fiat" ? input : fiatAmount === null ? "" : fiatAmount.toFixed(2);

  return (
    <section aria-labelledby="converter-title" className="rounded-3xl border border-line bg-panel p-6">
      <h2 id="converter-title" className="font-display text-xl font-semibold">
        Conversor
      </h2>

      <label className="mt-5 block text-sm text-dust" htmlFor="converter-btc">
        Bitcoin (BTC)
      </label>
      <input
        id="converter-btc"
        inputMode="decimal"
        autoComplete="off"
        value={btcValue}
        aria-invalid={invalid && source === "btc"}
        onChange={(event) => {
          setSource("btc");
          setInput(event.target.value);
        }}
        className={`${FIELD} mt-2`}
      />

      <label className="mt-4 block text-sm text-dust" htmlFor="converter-fiat">
        Monto en divisa
      </label>
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
        <input
          id="converter-fiat"
          inputMode="decimal"
          autoComplete="off"
          value={fiatValue}
          aria-invalid={invalid && source === "fiat"}
          onChange={(event) => {
            setSource("fiat");
            setInput(event.target.value);
          }}
          className={FIELD}
        />
        <select
          aria-label="Divisa"
          value={currency}
          onChange={(event) => setCurrency(event.target.value as Fiat)}
          className="rounded-xl border border-line bg-ink px-3 text-base font-medium text-cream focus:border-btc focus:outline-none"
        >
          {details && <option value="MXN">MXN</option>}
          <option value="USD">USD</option>
          {details && <option value="EUR">EUR</option>}
        </select>
      </div>

      <p className="mt-4 text-sm text-sand" aria-live="polite">
        {invalid ? (
          <span className="text-down">Escribe un número mayor o igual a cero.</span>
        ) : btcAmount !== null ? (
          <>{formatNumber(btcAmount * 100_000_000)} satoshis</>
        ) : (
          "Escribe un monto para convertir."
        )}
      </p>
      <p className="mt-1 text-sm text-dust">
        1 BTC = {formatFiat(rate, currency)} {currency}
      </p>
    </section>
  );
}
