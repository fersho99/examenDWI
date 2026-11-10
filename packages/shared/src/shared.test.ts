import { describe, expect, it } from "vitest";
import fixture from "../fixtures/prices.json";
import {
  ApiErrorSchema,
  INITIAL_COINS,
  PricesQuerySchema,
  PricesResponseSchema,
  formatPriceUsd,
  formatSignedPercent,
  isStale,
  priceDigits,
} from "./index";

describe("contrato de precios", () => {
  it("acepta el fixture que también lee el reloj", () => {
    expect(PricesResponseSchema.parse(fixture).data.prices).toHaveLength(3);
  });

  it("rechaza un precio sin fecha real", () => {
    const [first] = fixture.data.prices;
    const broken = { ...fixture, data: { prices: [{ ...first, asOf: "ayer" }] } };
    expect(PricesResponseSchema.safeParse(broken).success).toBe(false);
  });

  it("rechaza un código de error desconocido", () => {
    expect(ApiErrorSchema.safeParse({ error: { code: "oops", message: "x" } }).success).toBe(false);
  });
});

describe("consulta de precios", () => {
  it("separa y limpia ids", () => {
    expect(PricesQuerySchema.parse({ ids: "bitcoin, ethereum" }).ids).toEqual(["bitcoin", "ethereum"]);
  });

  it("permite omitir ids", () => {
    expect(PricesQuerySchema.parse({}).ids).toBeUndefined();
  });

  it("rechaza ids con caracteres raros", () => {
    expect(PricesQuerySchema.safeParse({ ids: "bitcoin;drop" }).success).toBe(false);
  });

  it("rechaza más de 25 ids", () => {
    const ids = Array.from({ length: 26 }, (_, i) => `c${i}`).join(",");
    expect(PricesQuerySchema.safeParse({ ids }).success).toBe(false);
  });
});

describe("formato de precios", () => {
  it.each([
    [76121.01, 0],
    [90.18, 2],
    [1.6, 2],
    [0.185, 4],
    [0.07215, 5],
    [0.00001234, 8],
  ])("%f usa %i decimales", (value, digits) => {
    expect(priceDigits(value)).toBe(digits);
  });

  it("no muestra DOGE como $0", () => {
    expect(formatPriceUsd(0.07215)).toBe("$0.07215");
  });

  it("muestra BTC sin centavos", () => {
    expect(formatPriceUsd(76121.01)).toBe("$76,121");
  });

  it("usa signo menos tipográfico", () => {
    expect(formatSignedPercent(-4.1)).toBe("−4.10%");
    expect(formatSignedPercent(1.236)).toBe("+1.24%");
  });
});

describe("frescura", () => {
  const now = new Date("2026-11-10T18:30:00Z");

  it("marca viejo un precio de hace 25 min", () => {
    expect(isStale("2026-11-10T18:05:00Z", now)).toBe(true);
  });

  it("acepta uno de hace 10 min", () => {
    expect(isStale("2026-11-10T18:20:00Z", now)).toBe(false);
  });
});

describe("monedas iniciales", () => {
  it("tiene 10 ids únicos", () => {
    expect(new Set(INITIAL_COINS.map((coin) => coin.id)).size).toBe(10);
  });
});
