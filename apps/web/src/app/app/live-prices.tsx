"use client";

import { PRIMARY_COIN_ID, formatSignedPercent, type Price } from "@bloque21/shared";
import Link from "next/link";
import { Freshness } from "./freshness";
import { CurrencySwitch, useMarket } from "./market-context";

/** Usa los precios del servidor en el primer render y después los del ciclo compartido de 30 s. */
export function LivePrices({ initial }: { initial: Price[] }) {
  const market = useMarket();
  const prices = market.prices.length > 0 ? market.prices : initial;
  const primary = prices.find((price) => price.coinId === PRIMARY_COIN_ID) ?? prices[0];

  if (!primary && !market.loaded) return <PricesSkeleton />;

  if (!primary) {
    return (
      <section className="rise space-y-3">
        <h1 className="font-display text-3xl font-semibold">Aún no hay precios</h1>
        <p className="text-sand">
          Ni la base de datos ni Binance respondieron. Esta pantalla se actualiza sola cada 30 segundos.
        </p>
      </section>
    );
  }

  const others = prices.filter((price) => price !== primary);
  const shown = market.toDisplay(primary.priceUsd);

  return (
    <div className="space-y-10">
      <section aria-labelledby="primary-name" className="rise">
        <div className="flex items-center justify-between gap-4">
          <h1 id="primary-name" className="text-lg text-sand">
            {primary.name}
          </h1>
          <CurrencySwitch />
        </div>
        <Link href={`/app/${primary.coinId}`} className="press block rounded-2xl">
          <p className="mt-1 font-display text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">
            {market.money(primary.priceUsd)}
          </p>
        </Link>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-3 text-sm">
          <Change value={primary.change24hPct} />
          <Freshness asOf={primary.asOf} stale={primary.stale} />
        </p>
        <p className="mt-1 text-sm text-dust">
          Precios en {shown.currency === "MXN" ? "pesos mexicanos" : "dólares"}
          {shown.currency === "MXN" && market.usdMxn !== null
            ? `, a ${market.usdMxn.toFixed(2)} pesos por dólar`
            : ""}
          .
        </p>
        {market.offline && (
          <p role="status" className="mt-3 text-sm text-sand">
            No hay conexión con el servidor. Mostramos lo último que recibimos.
          </p>
        )}
      </section>

      {others.length > 0 && (
        <section aria-labelledby="others-title" className="rise" style={{ "--delay": "80ms" } as React.CSSProperties}>
          <h2 id="others-title" className="font-display text-xl font-semibold">
            Otras monedas
          </h2>
          <ul className="mt-3">
            {others.map((price) => (
              <li key={price.coinId}>
                <Link
                  href={`/app/${price.coinId}`}
                  className="press -mx-2 flex min-h-14 items-center justify-between gap-4 rounded-xl px-2 hover:bg-panel"
                >
                  <span>
                    <span className="font-medium">{price.symbol}</span>
                    <span className="ml-2 text-sm text-dust">{price.name}</span>
                  </span>
                  <span className="text-right tabular-nums">
                    <span className="block">{market.money(price.priceUsd)}</span>
                    <Change value={price.change24hPct} size="sm" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Esqueleto con la forma real de la pantalla mientras llega el primer precio. */
export function PricesSkeleton() {
  return (
    <div aria-hidden className="space-y-10">
      <div className="space-y-3">
        <div className="skeleton h-5 w-24" />
        <div className="skeleton h-14 w-64" />
        <div className="skeleton h-5 w-40" />
      </div>
      <div className="space-y-5">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="skeleton h-5 w-28" />
            <div className="skeleton h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Change({ value, size = "md" }: { value: number | null; size?: "sm" | "md" }) {
  const text = size === "sm" ? "text-sm" : "text-base";
  if (value === null) return <span className={`${text} text-dust`}>Sin 24 h de historial</span>;
  const tone = value > 0 ? "text-up" : value < 0 ? "text-down" : "text-sand";
  return (
    <span className={`${text} ${tone} tabular-nums`}>
      {formatSignedPercent(value)}
      <span className="sr-only"> en 24 horas</span>
    </span>
  );
}
