import { PricesQuerySchema, PricesResponseSchema } from "@bloque21/shared";
import { connection, type NextRequest } from "next/server";
import { apiError } from "@/server/http";
import { loadPrices } from "@/server/market/price-service";

export async function GET(request: NextRequest) {
  await connection();

  const query = PricesQuerySchema.safeParse({
    ids: request.nextUrl.searchParams.get("ids") ?? undefined,
  });
  if (!query.success) {
    return apiError("invalid_input", "La lista de monedas no es válida: usa ids separados por comas, máximo 25.");
  }

  let result;
  try {
    result = await loadPrices(query.data.ids);
  } catch (error) {
    console.error("prices: ni Neon ni Binance respondieron", error);
    return apiError("source_unavailable", "No pudimos leer precios en este momento. Intenta en un minuto.", {
      retryAfter: 30,
    });
  }

  if (result.prices.length === 0) {
    return apiError("not_found", "No hay precios para esas monedas.");
  }

  const body = PricesResponseSchema.parse({
    data: { prices: result.prices },
    meta: { generatedAt: new Date().toISOString(), servedFrom: result.servedFrom },
  });

  return Response.json(body, {
    headers: { "cache-control": "public, s-maxage=15, stale-while-revalidate=45" },
  });
}
