import type { ChartRange } from "./types";

const LOCALE = "es-MX";
// Zona fija para que el servidor y el navegador generen el mismo texto.
const TIME_ZONE = "America/Mexico_City";

export type Fiat = "USD" | "MXN" | "EUR";

const money = (currency: Fiat, digits: number) =>
  new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });

const usdWhole = money("USD", 0);

export function formatUsd(value: number) {
  return usdWhole.format(value);
}

export function formatFiat(value: number, currency: Fiat) {
  return money(currency, 2).format(value);
}

const compactUsd = new Intl.NumberFormat(LOCALE, {
  notation: "compact",
  compactDisplay: "long",
  maximumFractionDigits: 2,
});

export function formatCompactUsd(value: number) {
  return `$${compactUsd.format(value)}`;
}

const wholeNumber = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

export function formatNumber(value: number) {
  return wholeNumber.format(value);
}

export function formatPercent(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`;
}

export function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}%`;
}

const clock = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const dayMonth = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  timeZone: TIME_ZONE,
});

const monthYear = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  year: "2-digit",
  timeZone: TIME_ZONE,
});

const fullDate = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const fullDateTime = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

export function formatClock(value: string | number) {
  return clock.format(new Date(value));
}

export function formatDate(value: string | number) {
  return fullDate.format(new Date(value));
}

export function formatDateTime(value: string | number) {
  return fullDateTime.format(new Date(value));
}

export function formatAxisDate(value: number, range: ChartRange) {
  if (range === "1") return clock.format(value);
  if (range === "365") return monthYear.format(value);
  return dayMonth.format(value);
}
