"use client";

import {
  ChartResponseSchema,
  PricesResponseSchema,
  formatPriceUsd,
  formatSignedPercent,
  type ChartDays,
  type Price,
} from "@bloque21/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { PriceChart } from "@/components/price-chart";
import { RangeControl } from "@/components/range-control";
import { CHART_RANGES, type ChartPoint } from "@/lib/types";
import { Freshness } from "../freshness";
import { CurrencySwitch, useMarket } from "../market-context";

const REFRESH_MS = 30_000;

interface Coin {
  id: string;
  name: string;
  symbol: string;
  tint: string;
}

export function CoinDetail({
  coin,
  initialPrice,
  initialDays,
  initialPoints,
}: {
  coin: Coin;
  initialPrice: Price | null;
  initialDays: ChartDays;
  initialPoints: ChartPoint[];
}) {
  const market = useMarket();
  const [price, setPrice] = useState(initialPrice);
  const [selected, setSelected] = useState<ChartDays>(initialDays);
  const [shown, setShown] = useState({ days: initialDays, points: initialPoints });
  const [busy, setBusy] = useState(false);
  const [chartError, setChartError] = useState(false);
  const cache = useRef(new Map<ChartDays, ChartPoint[]>(initialPoints.length ? [[initialDays, initialPoints]] : []));
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    async function refresh() {
      if (document.hidden) return;
      try {
        const response = await fetch(`/api/v1/prices?ids=${coin.id}`, { cache: "no-store" });
        if (!response.ok) return;
        const body = PricesResponseSchema.parse(await response.json());
        if (active && body.data.prices[0]) setPrice(body.data.prices[0]);
      } catch {
        // Se conserva el último precio; Freshness indica su antigüedad.
      }
    }
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [coin.id]);

  async function loadRange(days: ChartDays) {
    request.current?.abort();
    setSelected(days);
    setChartError(false);

    const hit = cache.current.get(days);
    if (hit) {
      setBusy(false);
      setShown({ days, points: hit });
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/coins/${coin.id}/chart?days=${days}`, { signal: controller.signal });
      if (!response.ok) throw new Error(String(response.status));
      const { data } = ChartResponseSchema.parse(await response.json());
      cache.current.set(days, data.points);
      setShown({ days, points: data.points });
    } catch {
      if (controller.signal.aborted) return;
      setChartError(true);
      setSelected(shown.days);
    }
    setBusy(false);
  }

  const summary = useMemo(() => {
    const closes = shown.points.map(([, close]) => close);
    if (closes.length < 2) return null;
    return {
      change: (closes[closes.length - 1]! / closes[0]! - 1) * 100,
      high: Math.max(...closes),
      low: Math.min(...closes),
    };
  }, [shown.points]);

  const rangeLabel = CHART_RANGES.find((range) => range.value === shown.days)?.label;

  return (
    <div className="mt-2 space-y-6">
      <section aria-labelledby="coin-name" className="rise">
        <div className="flex items-center justify-between gap-4">
          <h1 id="coin-name" className="text-lg text-sand">
            {coin.name} <span className="text-dust">{coin.symbol}</span>
          </h1>
          <CurrencySwitch />
        </div>
        {price ? (
          <>
            <p className="mt-1 font-display text-5xl font-semibold tracking-tight tabular-nums">
              {market.money(price.priceUsd)}
            </p>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-3 text-sm">
              {price.change24hPct !== null && (
                <span className={`tabular-nums ${price.change24hPct >= 0 ? "text-up" : "text-down"}`}>
                  {formatSignedPercent(price.change24hPct)} en 24 h
                </span>
              )}
              <Freshness asOf={price.asOf} stale={price.stale} />
            </p>
          </>
        ) : (
          <p className="mt-2 text-sand">El precio no está disponible por ahora. Reintentamos cada 30 segundos.</p>
        )}
      </section>

      <RangeControl selected={selected} onSelect={loadRange} />

      {chartError && (
        <p role="alert" className="text-sm text-down">
          No se pudo cargar ese rango. Prueba de nuevo en un momento.
        </p>
      )}

      {summary && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-dust">Variación {rangeLabel}</dt>
            <dd className={`tabular-nums ${summary.change >= 0 ? "text-up" : "text-down"}`}>
              {formatSignedPercent(summary.change)}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-dust">Máximo</dt>
            <dd className="tabular-nums">{formatPriceUsd(summary.high)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-dust">Mínimo</dt>
            <dd className="tabular-nums">{formatPriceUsd(summary.low)}</dd>
          </div>
        </dl>
      )}

      <PriceChart points={shown.points} range={shown.days} busy={busy} label={coin.name} tint={coin.tint} />
      <p className="text-sm text-dust">Gráfica en dólares, con velas de Binance del par {coin.symbol}/USDT.</p>
    </div>
  );
}
