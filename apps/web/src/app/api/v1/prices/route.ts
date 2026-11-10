import { PricesQuerySchema, PricesResponseSchema } from "@bloque21/shared";
import { connection, type NextRequest } from "next/server";
import { getDb } from "@/server/db/client";
import { env } from "@/server/env";
import { apiError } from "@/server/http";
import { getLatestPrices } from "@/server/market/prices";

export async function GET(request: NextRequest) {
  await connection();

  const query = PricesQuerySchema.safeParse({
    ids: request.nextUrl.searchParams.get("ids") ?? undefined,
  });
  if (!query.success) {
    return apiError("invalid_input", "La lista de monedas no es válida: usa ids separados por comas, máximo 25.");
  }

  let prices;
  try {
    prices = await getLatestPrices(getDb(env("DATABASE_URL")), query.data.ids);
  } catch (error) {
    console.error("prices: fallo al leer Neon", error);
    return apiError("source_unavailable", "No pudimos leer los precios guardados. Intenta en un momento.", {
      retryAfter: 30,
    });
  }

  if (prices.length === 0) {
    return apiError("not_found", "Todavía no hay precios guardados para esas monedas.");
  }

  const body = PricesResponseSchema.parse({
    data: { prices },
    meta: { generatedAt: new Date().toISOString() },
  });

  return Response.json(body, {
    headers: { "cache-control": "public, s-maxage=15, stale-while-revalidate=45" },
  });
}
