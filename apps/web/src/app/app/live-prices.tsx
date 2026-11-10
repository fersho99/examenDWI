"use client";

import {
  PRIMARY_COIN_ID,
  PricesResponseSchema,
  formatPriceUsd,
  formatSignedPercent,
  type Price,
} from "@bloque21/shared";
import { useEffect, useState } from "react";

const REFRESH_MS = 30_000;

const clock = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Mexico_City",
});

/**
 * Sin reloj del cliente (primer render, igual en servidor y navegador) se muestra la hora
 * absoluta; ya montado, el tiempo relativo.
 */
function freshness(asOf: string, now: number | null, stale: boolean) {
  const at = clock.format(new Date(asOf));
  if (stale) return `Último precio de las ${at}. La fuente no se ha actualizado desde entonces.`;
  if (now === null) return `Actualizado a las ${at}, con datos de Binance`;
  const minutes = Math.max(0, Math.round((now - new Date(asOf).getTime()) / 60_000));
  const when = minutes < 1 ? "hace un momento" : `hace ${minutes} min`;
  return `Actualizado ${when}, con datos de Binance`;
}

export function LivePrices({ initial }: { initial: Price[] }) {
  const [prices, setPrices] = useState(initial);
  const [now, setNow] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const tick = () => setNow(Date.now());
    const clockTimer = setInterval(tick, 60_000);
    queueMicrotask(tick);

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
      } finally {
        if (active) setNow(Date.now());
      }
    }

    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      clearInterval(clockTimer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const primary = prices.find((price) => price.coinId === PRIMARY_COIN_ID) ?? prices[0];

  if (!primary) {
    return (
      <section className="rise space-y-3">
        <h1 className="font-display text-3xl font-semibold">Aún no hay precios guardados</h1>
        <p className="text-sand">
          La primera ingesta todavía no corre o no pudo leer la base de datos. Esta pantalla se
          actualiza sola cada 30 segundos.
        </p>
      </section>
    );
  }

  const others = prices.filter((price) => price !== primary);

  return (
    <div className="space-y-10">
      <section aria-labelledby="primary-name" className="rise">
        <h1 id="primary-name" className="text-lg text-sand">
          {primary.name}
        </h1>
        <p className="mt-1 font-display text-6xl font-semibold tracking-tight tabular-nums">
          {formatPriceUsd(primary.priceUsd)}
        </p>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-3 text-sm">
          <Change value={primary.change24hPct} />
          <span className={primary.stale ? "text-down" : "text-dust"}>
            {freshness(primary.asOf, now, primary.stale)}
          </span>
        </p>
        {failed && (
          <p role="status" className="mt-3 text-sm text-sand">
            No hay conexión con el servidor. Mostramos lo último que recibimos.
          </p>
        )}
      </section>

      {others.length > 0 && (
        <section aria-labelledby="others-title" className="rise" style={{ animationDelay: "80ms" }}>
          <h2 id="others-title" className="font-display text-xl font-semibold">
            Otras monedas
          </h2>
          <ul className="mt-4 space-y-1">
            {others.map((price) => (
              <li key={price.coinId} className="flex min-h-12 items-center justify-between gap-4">
                <span>
                  <span className="font-medium">{price.symbol}</span>
                  <span className="ml-2 text-sm text-dust">{price.name}</span>
                </span>
                <span className="text-right tabular-nums">
                  <span className="block">{formatPriceUsd(price.priceUsd)}</span>
                  <Change value={price.change24hPct} size="sm" />
                </span>
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
