import { z } from "zod";

export const API_ERROR_CODES = [
  "invalid_input",
  "unauthorized",
  "forbidden",
  "not_found",
  "rate_limited",
  "source_unavailable",
  "internal",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
    retryAfter: z.number().int().positive().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

const isoDate = z.iso.datetime({ offset: true });

export const PriceSchema = z.object({
  coinId: z.string().min(1),
  symbol: z.string().min(1),
  name: z.string().min(1),
  priceUsd: z.number().positive(),
  /** Variación en las últimas 24 h, en porcentaje. null si aún no hay 24 h de historial. */
  change24hPct: z.number().nullable(),
  /** Momento real del dato, no de la respuesta. */
  asOf: isoDate,
  source: z.enum(["binance"]),
  stale: z.boolean(),
});
export type Price = z.infer<typeof PriceSchema>;

export const PricesResponseSchema = z.object({
  data: z.object({ prices: z.array(PriceSchema) }),
  meta: z.object({
    generatedAt: isoDate,
    /** database: velas guardadas en Neon. live: Neon no respondió y se leyó Binance directo. */
    servedFrom: z.enum(["database", "live"]),
  }),
});
export type PricesResponse = z.infer<typeof PricesResponseSchema>;

/** Rangos de la gráfica en días, como en el sitio actual. */
export const CHART_DAYS = ["1", "7", "30", "90", "365"] as const;
export const ChartDaysSchema = z.enum(CHART_DAYS);
export type ChartDays = (typeof CHART_DAYS)[number];

export const ChartResponseSchema = z.object({
  data: z.object({
    coinId: z.string(),
    days: ChartDaysSchema,
    /** Pares [marca de tiempo en ms, precio de cierre en USD], del más viejo al más nuevo. */
    points: z.array(z.tuple([z.number().int(), z.number().positive()])),
  }),
  meta: z.object({ generatedAt: isoDate, servedFrom: z.enum(["database", "live"]) }),
});
export type ChartResponse = z.infer<typeof ChartResponseSchema>;

/** Ids de CoinGecko: minúsculas, números y guiones. */
export const CoinIdSchema = z.string().regex(/^[a-z0-9-]{1,64}$/);

export const PricesQuerySchema = z.object({
  ids: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",").map((id) => id.trim()) : undefined))
    .pipe(z.array(CoinIdSchema).min(1).max(25).optional()),
});
