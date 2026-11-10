"use client";

import { useMemo, useRef, useState } from "react";
import { Change } from "@/components/change";
import { Converter } from "@/components/converter";
import { LiveStatus } from "@/components/live-status";
import { PriceChart } from "@/components/price-chart";
import { RangeControl } from "@/components/range-control";
import { SentimentMeter } from "@/components/sentiment-meter";
import {
  formatCompactUsd,
  formatDate,
  formatNumber,
  formatPercent,
  formatSignedPercent,
  formatUsd,
} from "@/lib/format";
import { CHART_RANGES, type ChartPoint, type ChartRange, type Market, type Sentiment } from "@/lib/types";
import { useMarket } from "@/lib/use-market";

const DEFAULT_RANGE: ChartRange = "7";

interface Props {
  initialMarket: Market | null;
  initialChart: ChartPoint[];
  initialSentiment: Sentiment | null;
}

export function DashboardView({ initialMarket, initialChart, initialSentiment }: Props) {
  const { market, sentiment, tick, offline } = useMarket(initialMarket, initialSentiment);

  const [selected, setSelected] = useState<ChartRange>(DEFAULT_RANGE);
  const [shown, setShown] = useState({ range: DEFAULT_RANGE, points: initialChart });
  const [busy, setBusy] = useState(false);
  const [chartError, setChartError] = useState(false);
  const chartCache = useRef(
    new Map<ChartRange, ChartPoint[]>(
      initialChart.length > 0 ? [[DEFAULT_RANGE, initialChart]] : [],
    ),
  );
  const request = useRef<AbortController | null>(null);

  async function loadRange(next: ChartRange) {
    request.current?.abort();
    setSelected(next);
    setChartError(false);

    const hit = chartCache.current.get(next);
    if (hit) {
      setBusy(false);
      setShown({ range: next, points: hit });
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    setBusy(true);

    try {
      const response = await fetch(`/api/bitcoin/chart?days=${next}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(String(response.status));

      const { points } = (await response.json()) as { points: ChartPoint[] };
      chartCache.current.set(next, points);
      setShown({ range: next, points });
    } catch {
      if (controller.signal.aborted) return;
      setChartError(true);
      setSelected(shown.range);
    }

    setBusy(false);
  }

  // El último punto de la gráfica sigue al precio más reciente.
  const points = useMemo<ChartPoint[]>(() => {
    if (!market || shown.points.length === 0) return shown.points;
    const last = shown.points[shown.points.length - 1];
    return market.updatedAt > last[0]
      ? [...shown.points, [market.updatedAt, market.priceUsd]]
      : shown.points;
  }, [market, shown.points]);

  const summary = useMemo(() => {
    if (points.length === 0) return null;
    const prices = points.map(([, price]) => price);
    return {
      change: (prices[prices.length - 1] / prices[0] - 1) * 100,
      high: Math.max(...prices),
      low: Math.min(...prices),
    };
  }, [points]);

  if (!market) {
    return (
      <div className="rise rounded-3xl border border-line bg-panel p-8 text-center">
        <h1 className="font-display text-3xl font-semibold">
          No pudimos cargar el mercado
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sand">
          No hubo respuesta de la fuente de precios. Revisa tu conexión y vuelve
          a intentarlo.
        </p>
        <a
          href="/dashboard"
          className="press mt-6 inline-flex rounded-full bg-btc px-6 py-3 font-semibold text-ink hover:bg-[#ffa63d]"
        >
          Reintentar
        </a>
      </div>
    );
  }

  const rangeLabel = CHART_RANGES.find((range) => range.value === shown.range)?.label;
  const dayPosition =
    market.high24h > market.low24h
      ? Math.min(100, Math.max(0, ((market.priceUsd - market.low24h) / (market.high24h - market.low24h)) * 100))
      : 50;
  const { details } = market;

  return (
    <div className="space-y-10">
      <section aria-labelledby="price-title">
        <div className="rise flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h1 id="price-title" className="font-medium text-sand">
                Bitcoin · BTC
              </h1>
              <LiveStatus updatedAt={market.updatedAt} offline={offline || market.stale} />
            </div>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span
                data-tick={tick ?? undefined}
                className="price-figure text-5xl font-semibold tracking-tight sm:text-6xl"
              >
                {formatUsd(market.priceUsd)}
              </span>
              <Change value={market.change24h} suffix="24h" />
            </p>
          </div>
          <RangeControl selected={selected} onSelect={loadRange} />
        </div>

        {chartError && (
          <p role="alert" className="rise mt-4 text-sm text-down">
            No se pudo cargar ese rango. Prueba de nuevo en un momento.
          </p>
        )}

        {summary && (
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <dt className="text-dust">Variación {rangeLabel}</dt>
              <dd>
                <Change value={summary.change} size="sm" />
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-dust">Máximo</dt>
              <dd>{formatUsd(summary.high)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-dust">Mínimo</dt>
              <dd>{formatUsd(summary.low)}</dd>
            </div>
          </dl>
        )}

        <div
          className="rise mt-4"
          style={{ "--delay": "70ms" } as React.CSSProperties}
        >
          <PriceChart points={points} range={shown.range} busy={busy} />
        </div>
      </section>

      <section
        aria-label="Métricas clave"
        className="rise grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4"
        style={{ "--delay": "140ms" } as React.CSSProperties}
      >
        {details ? (
          <>
            <Stat label="Capitalización" value={formatCompactUsd(details.marketCapUsd)} />
            <Stat label="Volumen 24h" value={formatCompactUsd(details.volumeUsd)} />
            <Stat
              label="Máximo histórico"
              value={formatUsd(details.athUsd)}
              detail={`${formatDate(details.athDate)} · ${formatSignedPercent(details.athChange)} desde entonces`}
            />
            <Stat
              label="En circulación"
              value={`${formatNumber(details.circulatingSupply)} BTC`}
              detail={`${formatPercent((details.circulatingSupply / details.maxSupply) * 100, 1)} de los 21 millones`}
            />
          </>
        ) : (
          <p className="bg-panel p-6 text-sand sm:col-span-2 lg:col-span-4">
            Las métricas de mercado no están disponibles por ahora. Se cargarán
            automáticamente cuando la API responda.
          </p>
        )}
      </section>

      <div
        className="rise grid gap-6 lg:grid-cols-3"
        style={{ "--delay": "210ms" } as React.CSSProperties}
      >
        <section aria-labelledby="day-title" className="rounded-3xl border border-line bg-panel p-6">
          <h2 id="day-title" className="font-display text-xl font-semibold">
            Hoy y en perspectiva
          </h2>
          <div className="mt-5">
            <div className="flex justify-between text-sm">
              <span className="text-dust">Mín. 24h</span>
              <span className="text-dust">Máx. 24h</span>
            </div>
            <div className="relative mt-2 h-1.5 rounded-full bg-line">
              <span
                className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel bg-btc"
                style={{ left: `${dayPosition}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-sm font-medium">
              <span>{formatUsd(market.low24h)}</span>
              <span>{formatUsd(market.high24h)}</span>
            </div>
          </div>
          {details && (
            <dl className="mt-6 divide-y divide-line border-t border-line text-sm">
              <Row label="7 días" value={details.change7d} />
              <Row label="30 días" value={details.change30d} />
              <Row label="1 año" value={details.change1y} />
            </dl>
          )}
        </section>

        <SentimentMeter sentiment={sentiment} />
        <Converter market={market} />
      </div>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="bg-panel p-5 sm:p-6">
      <p className="text-sm text-dust">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{value}</p>
      {detail && <p className="mt-1 text-sm text-sand">{detail}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-sand">{label}</dt>
      <dd>
        <Change value={value} size="sm" />
      </dd>
    </div>
  );
}
