"use client";

import { INITIAL_COINS } from "@bloque21/shared";
import type { ReactNode } from "react";

export const FIELD =
  "mt-2 w-full min-h-12 rounded-xl border border-line bg-panel px-4 text-base text-cream placeholder:text-dust transition-colors duration-150 focus:border-btc focus:outline-none";

export const PRIMARY_BUTTON =
  "press min-h-12 rounded-full bg-btc px-6 font-semibold text-ink hover:bg-[#ffa63d] disabled:opacity-50";

export const QUIET_BUTTON = "press min-h-12 rounded-full px-4 text-sand hover:text-cream";

/** Acepta coma o punto decimal, como se escribe en México con teclados distintos. */
export function parseAmount(raw: string): number | null {
  const normalized = raw.replace(/\s/g, "").replace(/,(?=\d{1,8}$)/, ".").replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function CoinSelect({
  value,
  onChange,
  label = "Moneda",
}: {
  value: string;
  onChange: (coinId: string) => void;
  label?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className={FIELD}>
        {INITIAL_COINS.map((coin) => (
          <option key={coin.id} value={coin.id}>
            {coin.name} ({coin.symbol})
          </option>
        ))}
      </select>
    </label>
  );
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-full bg-panel p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`min-h-11 flex-1 rounded-full px-3 text-sm font-medium transition-colors duration-150 ${active ? "bg-btc text-ink" : "text-sand hover:text-cream"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ScreenTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="rise flex items-center justify-between gap-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{children}</h1>
      {aside}
    </div>
  );
}

export function tone(value: number | null) {
  if (value === null || value === 0) return "text-sand";
  return value > 0 ? "text-up" : "text-down";
}
