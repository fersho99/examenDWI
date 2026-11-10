import { describe, expect, it } from "vitest";
import {
  ALERT_COOLDOWN_MS,
  buildPositions,
  evaluateAlerts,
  formatMoney,
  formatSignedMoney,
  initialArmed,
  sumPortfolio,
  valuePositions,
  type AlertQuote,
  type AlertRule,
  type Transaction,
} from "./index";

const tx = (partial: Partial<Transaction> & Pick<Transaction, "side" | "quantity" | "priceUsd">): Transaction => ({
  id: Math.random().toString(36),
  coinId: "bitcoin",
  fxMxn: 18,
  executedAt: "2026-11-01T12:00:00.000Z",
  ...partial,
});

describe("portafolio", () => {
  it("promedia el costo de dos compras", () => {
    const [btc] = buildPositions([
      tx({ side: "buy", quantity: 1, priceUsd: 60000, executedAt: "2026-11-01T00:00:00Z" }),
      tx({ side: "buy", quantity: 1, priceUsd: 80000, executedAt: "2026-11-02T00:00:00Z" }),
    ]);
    expect(btc?.quantity).toBe(2);
    expect(btc?.avgCostUsd).toBe(70000);
  });

  it("una venta realiza ganancia al costo promedio y no cambia el promedio", () => {
    const [btc] = buildPositions([
      tx({ side: "buy", quantity: 2, priceUsd: 70000, executedAt: "2026-11-01T00:00:00Z" }),
      tx({ side: "sell", quantity: 0.5, priceUsd: 80000, executedAt: "2026-11-03T00:00:00Z" }),
    ]);
    expect(btc?.quantity).toBe(1.5);
    expect(btc?.avgCostUsd).toBe(70000);
    expect(btc?.realizedUsd).toBe(5000);
  });

  it("ordena por fecha aunque se registren desordenados", () => {
    const [btc] = buildPositions([
      tx({ side: "sell", quantity: 1, priceUsd: 80000, executedAt: "2026-11-03T00:00:00Z" }),
      tx({ side: "buy", quantity: 1, priceUsd: 70000, executedAt: "2026-11-01T00:00:00Z" }),
    ]);
    expect(btc?.quantity).toBe(0);
    expect(btc?.realizedUsd).toBe(10000);
  });

  it("rechaza vender más de lo que tienes", () => {
    expect(() => buildPositions([tx({ side: "sell", quantity: 1, priceUsd: 1 })])).toThrow(/sin unidades/);
  });

  it("la ganancia en MXN usa el tipo de cambio de la compra para el costo", () => {
    const positions = buildPositions([tx({ side: "buy", quantity: 1, priceUsd: 70000, fxMxn: 17 })]);
    const [valued] = valuePositions(positions, new Map([["bitcoin", 70000]]), 18.5);
    // Mismo precio en USD, pero el peso se debilitó: ganas en MXN sin ganar en USD.
    expect(valued?.unrealizedUsd).toBe(0);
    expect(valued?.unrealizedMxn).toBeCloseTo(70000 * 1.5);
  });

  it("suma el total y marca incompleto si falta un precio", () => {
    const positions = buildPositions([
      tx({ side: "buy", quantity: 1, priceUsd: 100, coinId: "a" }),
      tx({ side: "buy", quantity: 1, priceUsd: 100, coinId: "b" }),
    ]);
    const total = sumPortfolio(valuePositions(positions, new Map([["a", 150]]), 18));
    expect(total.complete).toBe(false);
    expect(total.valueUsd).toBe(150);
  });
});

const rule = (partial: Partial<AlertRule> = {}): AlertRule => ({
  id: "r1",
  coinId: "bitcoin",
  kind: "below",
  threshold: 70000,
  enabled: true,
  armed: true,
  lastFiredAt: null,
  createdAt: "2026-11-10T00:00:00.000Z",
  ...partial,
});

const quotes = (priceUsd: number, extra: Partial<AlertQuote> = {}) =>
  new Map([["bitcoin", { priceUsd, change24hPct: 0, stale: false, ...extra }]]);

const NOW = new Date("2026-11-10T18:00:00Z");
const makeId = () => "e1";

describe("alertas", () => {
  it("dispara al cruzar el umbral y se desarma", () => {
    const { rules, fired } = evaluateAlerts([rule()], quotes(69000), NOW, makeId);
    expect(fired).toHaveLength(1);
    expect(fired[0]?.value).toBe(69000);
    expect(rules[0]?.armed).toBe(false);
  });

  it("no vuelve a disparar mientras el precio siga abajo", () => {
    const { fired } = evaluateAlerts([rule({ armed: false })], quotes(69000), NOW, makeId);
    expect(fired).toHaveLength(0);
  });

  it("se rearma cuando la condición deja de cumplirse", () => {
    const { rules } = evaluateAlerts([rule({ armed: false })], quotes(71000), NOW, makeId);
    expect(rules[0]?.armed).toBe(true);
  });

  it("respeta el enfriamiento de 30 min aunque esté armada", () => {
    const recent = new Date(NOW.getTime() - ALERT_COOLDOWN_MS / 2).toISOString();
    const { fired } = evaluateAlerts([rule({ lastFiredAt: recent })], quotes(69000), NOW, makeId);
    expect(fired).toHaveLength(0);
  });

  it("nunca dispara con un precio viejo ni con la regla apagada", () => {
    expect(evaluateAlerts([rule()], quotes(69000, { stale: true }), NOW, makeId).fired).toHaveLength(0);
    expect(evaluateAlerts([rule({ enabled: false })], quotes(69000), NOW, makeId).fired).toHaveLength(0);
  });

  it("la variación de 24 h dispara en subida o bajada", () => {
    const move = rule({ kind: "move24h", threshold: 5 });
    expect(evaluateAlerts([move], quotes(1, { change24hPct: -6 }), NOW, makeId).fired).toHaveLength(1);
    expect(evaluateAlerts([move], quotes(1, { change24hPct: 4 }), NOW, makeId).fired).toHaveLength(0);
  });

  it("una regla nueva que ya se cumple nace desarmada", () => {
    expect(initialArmed("below", 70000, { priceUsd: 69000, change24hPct: 0, stale: false })).toBe(false);
    expect(initialArmed("above", 80000, { priceUsd: 69000, change24hPct: 0, stale: false })).toBe(true);
  });
});

describe("moneda", () => {
  it("formatea pesos y dólares", () => {
    expect(formatMoney(1372813, "MXN")).toBe("$1,372,813");
    expect(formatMoney(0.07215, "USD")).toBe("$0.07215");
    expect(formatSignedMoney(-1520.5, "MXN")).toBe("−$1,520.50");
  });
});
