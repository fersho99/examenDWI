const LOCALE = "es-MX";

const formatters = new Map<number, Intl.NumberFormat>();

function usd(fractionDigits: number) {
  let formatter = formatters.get(fractionDigits);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: "USD",
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(fractionDigits, formatter);
  }
  return formatter;
}

/**
 * Decimales según la magnitud, para que una moneda de centavos no se vea como $0:
 * 76121.4 da $76,121; 90.18 da $90.18; 0.07215 da $0.07215.
 */
export function priceDigits(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1000) return 0;
  if (abs >= 1 || abs === 0) return 2;
  // Cuatro cifras significativas para valores menores a 1.
  return Math.min(8, Math.max(2, 3 - Math.floor(Math.log10(abs))));
}

export function formatPriceUsd(value: number) {
  return usd(priceDigits(value)).format(value);
}

export const DISPLAY_CURRENCIES = ["MXN", "USD"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

const moneyFormatters = new Map<string, Intl.NumberFormat>();

/**
 * Cantidad en la moneda elegida. MXN y USD usan el mismo símbolo $ en es-MX, así que la
 * interfaz siempre deja visible qué moneda está activa.
 */
export function formatMoney(value: number, currency: DisplayCurrency, digits = priceDigits(value)) {
  const key = `${currency}:${digits}`;
  let formatter = moneyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    moneyFormatters.set(key, formatter);
  }
  return formatter.format(value);
}

/** Para montos de ganancia o pérdida: siempre con signo y centavos. */
export function formatSignedMoney(value: number, currency: DisplayCurrency) {
  const text = formatMoney(Math.abs(value), currency, 2);
  return value > 0 ? `+${text}` : value < 0 ? `−${text}` : text;
}

const quantityFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 8 });

export function formatQuantity(value: number) {
  return quantityFormat.format(value);
}

export function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}
