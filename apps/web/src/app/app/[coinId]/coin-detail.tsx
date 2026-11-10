"use client";

import { formatPriceUsd, formatSignedPercent, type ChartDays, type Price } from "@bloque21/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { PriceChart } from "@/components/price-chart";
import { RangeControl } from "@/components/range-control";
import { fetchChart } from "@/lib/market-data";
import { CHART_RANGES, type ChartPoint } from "@/lib/types";
import { Freshness } from "../freshness";
import { CurrencySwitch, useMarket } from "../market-context";

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
  // El precio sigue al ciclo compartido de 30 s; mientras llega, el del servidor (si lo hay).
  const price = market.pricesById.get(coin.id) ?? initialPrice;
  const [selected, setSelected] = useState<ChartDays>(initialDays);
  const [shown, setShown] = useState({ days: initialDays, points: initialPoints });
  const [busy, setBusy] = useState(initialPoints.length === 0);
  const [chartError, setChartError] = useState(false);
  const cache = useRef(new Map<ChartDays, ChartPoint[]>(initialPoints.length ? [[initialDays, initialPoints]] : []));
  const request = useRef<AbortController | null>(null);

  // Sin historial inicial (la APK no tiene servidor), la primera gráfica se pide al abrir.
  useEffect(() => {
    if (initialPoints.length > 0) return;
    const controller = new AbortController();
    request.current = controller;
    fetchChart(coin.id, initialDays, controller.signal)
      .then((points) => {
        cache.current.set(initialDays, points);
        setShown({ days: initialDays, points });
      })
      .catch(() => {
        if (!controller.signal.aborted) setChartError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [coin.id, initialDays, initialPoints.length]);

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
      const points = await fetchChart(coin.id, days, controller.signal);
      cache.current.set(days, points);
      setShown({ days, points });
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
