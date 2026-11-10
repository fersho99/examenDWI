import { describe, expect, it } from "vitest";
import { hasBearerSecret } from "../http";
import { klinesToRequest } from "./ingest";
import { change24h, priceAsOf } from "./prices";
import { SourceError } from "./source-error";
import { fetchKlines, parseKlines } from "./sources/binance";

// Recorte real de /api/v3/klines?symbol=BTCUSDT&interval=5m (12 campos por vela).
const KLINES = [
  [1762797600000, "76010.00", "76150.20", "75990.10", "76121.01", "84.21", 1762797899999, "6405000.1", 9123, "41.0", "3120000.0", "0"],
  [1762797900000, "76121.01", "76200.00", "76100.00", "76180.50", "12.03", 1762798199999, "916000.2", 1402, "6.1", "464000.0", "0"],
];

describe("Binance", () => {
  it("convierte velas a números y fechas", () => {
    const [first] = parseKlines(KLINES);
    expect(first).toEqual({
      openTime: new Date(1762797600000),
      open: 76010,
      high: 76150.2,
      low: 75990.1,
      close: 76121.01,
      volume: 84.21,
    });
  });

  it("rechaza un precio que no es número", () => {
    expect(() => parseKlines([[1, "abc", "1", "1", "1", "1", 2]])).toThrow();
  });

  it("marca el 429 como límite de tasa y conserva Retry-After", async () => {
    const fake = (async () =>
      new Response("{}", { status: 429, headers: { "retry-after": "30" } })) as typeof fetch;
    const error = await fetchKlines("BTCUSDT", "5m", 10, fake).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SourceError);
    expect((error as SourceError).isRateLimited).toBe(true);
    expect((error as SourceError).retryAfterSec).toBe(30);
  });

  it("nunca pide más de 1000 velas", async () => {
    let requested = "";
    const fake = (async (url: URL) => {
      requested = url.searchParams.get("limit") ?? "";
      return Response.json(KLINES);
    }) as unknown as typeof fetch;
    await fetchKlines("BTCUSDT", "5m", 5000, fake);
    expect(requested).toBe("1000");
  });
});

describe("cuántas velas pedir", () => {
  const now = new Date("2026-11-10T18:00:00Z");

  it("hace respaldo completo sin historial", () => {
    expect(klinesToRequest(null, "5m", now)).toBe(1000);
  });

  it("pide lo que falta más la vela en curso", () => {
    expect(klinesToRequest(new Date("2026-11-10T17:00:00Z"), "5m", now)).toBe(13);
  });

  it("siempre pide al menos 2 para cerrar la vela anterior", () => {
    expect(klinesToRequest(new Date("2026-11-10T17:59:00Z"), "1d", now)).toBe(2);
  });
});

describe("precio", () => {
  it("usa la hora de lectura en la vela en curso", () => {
    const open = new Date("2026-11-10T18:00:00Z");
    const read = new Date("2026-11-10T18:02:10Z");
    expect(priceAsOf(open, read)).toEqual(read);
  });

  it("usa el cierre en una vela ya terminada", () => {
    const open = new Date("2026-11-10T18:00:00Z");
    expect(priceAsOf(open, new Date("2026-11-10T19:00:00Z"))).toEqual(new Date("2026-11-10T18:05:00Z"));
  });

  it("calcula la variación de 24 h y deja null sin historial", () => {
    expect(change24h(110, 100)).toBeCloseTo(10);
    expect(change24h(110, null)).toBeNull();
  });
});

describe("secreto de ingesta", () => {
  const secret = "s".repeat(40);
  const request = (value?: string) =>
    new Request("https://x.test", value ? { headers: { authorization: value } } : {});

  it("acepta el secreto correcto", () => {
    expect(hasBearerSecret(request(`Bearer ${secret}`), secret)).toBe(true);
  });

  it("rechaza ausente, distinto o sin prefijo", () => {
    expect(hasBearerSecret(request(), secret)).toBe(false);
    expect(hasBearerSecret(request("Bearer otro"), secret)).toBe(false);
    expect(hasBearerSecret(request(secret), secret)).toBe(false);
  });
});
