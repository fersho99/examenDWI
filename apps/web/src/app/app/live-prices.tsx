"use client";

import {
  PRIMARY_COIN_ID,
  PricesResponseSchema,
  formatPriceUsd,
  formatSignedPercent,
  type Price,
} from "@bloque21/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Freshness } from "./freshness";

const REFRESH_MS = 30_000;

export function LivePrices({ initial }: { initial: Price[] }) {
  const [prices, setPrices] = useState(initial);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function refresh() {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/v1/prices", { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const body = PricesResponseSchema.parse(await response.json());
        if (!active) return;
        setPrices(body.data.prices);
        setFailed(false);
      } catch {
        if (active) setFailed(true);
      }
    }

    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const primary = prices.find((price) => price.coinId === PRIMARY_COIN_ID) ?? prices[0];

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

  return (
    <div className="space-y-10">
      <section aria-labelledby="primary-name" className="rise">
        <Link href={`/app/${primary.coinId}`} className="press block rounded-2xl">
          <h1 id="primary-name" className="text-lg text-sand">
            {primary.name}
          </h1>
          <p className="mt-1 font-display text-6xl font-semibold tracking-tight tabular-nums">
            {formatPriceUsd(primary.priceUsd)}
          </p>
        </Link>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-3 text-sm">
          <Change value={primary.change24hPct} />
          <Freshness asOf={primary.asOf} stale={primary.stale} />
        </p>
        {failed && (
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
                    <span className="block">{formatPriceUsd(price.priceUsd)}</span>
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

function Change({ value, size = "md" }: { value: number | null; size?: "sm" | "md" }) {
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
