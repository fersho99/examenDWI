"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatPriceUsd } from "@bloque21/shared";
import { formatAxisDate, formatDateTime } from "@/lib/format";
import type { ChartPoint, ChartRange } from "@/lib/types";

const MARGIN = { top: 12, right: 72, bottom: 30, left: 2 };
const TABLE_ROWS = 24;

function niceTicks(min: number, max: number, count: number) {
  const rawStep = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;

  const ticks: number[] = [];
  for (let tick = Math.ceil(min / step) * step; tick <= max; tick += step) {
    ticks.push(tick);
  }
  return ticks;
}

function nearestIndex(points: ChartPoint[], time: number) {
  let low = 0;
  let high = points.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (points[middle][0] < time) low = middle;
    else high = middle;
  }
  return time - points[low][0] < points[high][0] - time ? low : high;
}

export function PriceChart({
  points,
  range,
  busy,
  label = "Bitcoin",
  tint = "var(--color-btc)",
}: {
  points: ChartPoint[];
  range: ChartRange;
  busy: boolean;
  /** Nombre de la moneda para el texto accesible. */
  label?: string;
  /** Tinta de la moneda para la línea y el punto. */
  tint?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(960);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (!box.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);

  const height = width < 640 ? 260 : 360;

  const chart = useMemo(() => {
    if (points.length < 2) return null;

    const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);
    const plotBottom = height - MARGIN.bottom;
    const plotHeight = plotBottom - MARGIN.top;

    const prices = points.map(([, price]) => price);
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const padding = (high - low || high * 0.01) * 0.08;
    const domainMin = low - padding;
    const domainMax = high + padding;
    const start = points[0][0];
    const end = points[points.length - 1][0];

    const x = (time: number) => MARGIN.left + ((time - start) / (end - start)) * plotWidth;
    const y = (price: number) =>
      MARGIN.top + (1 - (price - domainMin) / (domainMax - domainMin)) * plotHeight;

    const line = points
      .map(([time, price], index) => `${index ? "L" : "M"}${x(time).toFixed(1)} ${y(price).toFixed(1)}`)
      .join("");
    const area = `${line}L${x(end).toFixed(1)} ${plotBottom}L${x(start).toFixed(1)} ${plotBottom}Z`;

    const xCount = width < 520 ? 3 : 5;
    const xTicks = Array.from({ length: xCount }, (_, index) => {
      const time = start + ((end - start) * (index + 0.5)) / xCount;
      return { time, x: x(time) };
    });

    return {
      x,
      y,
      line,
      area,
      plotBottom,
      start,
      end,
      plotWidth,
      xTicks,
      yTicks: niceTicks(domainMin, domainMax, 5).map((price) => ({ price, y: y(price) })),
    };
  }, [points, width, height]);

  const rows = useMemo(() => {
    const step = Math.max(1, Math.ceil(points.length / TABLE_ROWS));
    return points.filter((_, index) => index % step === 0).reverse();
  }, [points]);

  if (!chart) {
    return (
      <div
        ref={box}
        className="flex h-64 items-center justify-center rounded-3xl border border-line text-center text-sand"
      >
        El historial no está disponible. Elige un rango para reintentar.
      </div>
    );
  }

  const activeIndex = active !== null && active < points.length ? active : null;
  const activePoint = activeIndex === null ? null : points[activeIndex];
  const last = points[points.length - 1];

  const first = points[0][1];
  const description = `Precio de ${label} en dólares. Inicia en ${formatPriceUsd(first)} y termina en ${formatPriceUsd(last[1])}. Usa las flechas para recorrer los puntos.`;

  return (
    <div>
      <div
        ref={box}
        role="img"
        aria-label={description}
        aria-busy={busy}
        tabIndex={0}
        className={`relative touch-pan-y rounded-lg transition-opacity duration-200 select-none ${busy ? "opacity-50" : ""}`}
        style={{ height }}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - rect.left - MARGIN.left) / chart.plotWidth;
          const time = chart.start + Math.min(1, Math.max(0, ratio)) * (chart.end - chart.start);
          setActive(nearestIndex(points, time));
        }}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive(points.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            const delta = event.key === "ArrowLeft" ? -1 : 1;
            setActive((current) =>
              Math.min(points.length - 1, Math.max(0, (current ?? points.length - 1) + delta)),
            );
          }
          if (event.key === "Escape") setActive(null);
        }}
      >
        <svg width={width} height={height} aria-hidden className="block">
          <defs>
            <linearGradient id="price-wash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tint} stopOpacity={0.16} />
              <stop offset="100%" stopColor={tint} stopOpacity={0} />
            </linearGradient>
          </defs>

          {chart.yTicks.map((tick) => (
            <g key={tick.price}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={tick.y}
                y2={tick.y}
                stroke="var(--color-line)"
              />
              <text
                x={width}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-dust text-xs tabular-nums"
              >
                {formatPriceUsd(tick.price)}
              </text>
            </g>
          ))}

          {chart.xTicks.map((tick) => (
            <text
              key={tick.time}
              x={tick.x}
              y={height - 8}
              textAnchor="middle"
              className="fill-dust text-xs tabular-nums"
            >
              {formatAxisDate(tick.time, range)}
            </text>
          ))}

          <g key={range} className="chart-wipe">
            <path d={chart.area} fill="url(#price-wash)" />
            <path
              d={chart.line}
              fill="none"
              stroke={tint}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {!activePoint && (
              <circle
                cx={chart.x(last[0])}
                cy={chart.y(last[1])}
                r={5}
                fill={tint}
                stroke="var(--color-ink)"
                strokeWidth={2}
              />
            )}
          </g>

          {activePoint && (
            <g>
              <line
                x1={chart.x(activePoint[0])}
                x2={chart.x(activePoint[0])}
                y1={MARGIN.top}
                y2={chart.plotBottom}
                stroke="var(--color-dust)"
              />
              <circle
                cx={chart.x(activePoint[0])}
                cy={chart.y(activePoint[1])}
                r={5}
                fill={tint}
                stroke="var(--color-ink)"
                strokeWidth={2}
              />
            </g>
          )}
        </svg>

        {activePoint && (
          <div
            className="pointer-events-none absolute top-1 z-10 w-44 rounded-xl border border-line bg-panel px-3 py-2 shadow-lg shadow-black/30"
            style={{
              left: Math.min(
                Math.max(0, chart.x(activePoint[0]) - 88),
                Math.max(0, width - 176),
              ),
            }}
          >
            <p className="font-semibold">{formatPriceUsd(activePoint[1])}</p>
            <p className="text-xs text-sand">{formatDateTime(activePoint[0])}</p>
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-sand hover:text-cream">
          Ver datos en tabla
        </summary>
        <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-line">
          <table className="w-full text-left tabular-nums">
            <thead className="sticky top-0 bg-panel text-dust">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Fecha</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Precio (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(([time, price]) => (
                <tr key={time}>
                  <td className="px-4 py-2 text-sand">{formatDateTime(time)}</td>
                  <td className="px-4 py-2 text-right">{formatPriceUsd(price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
