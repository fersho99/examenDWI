import { FxResponseSchema } from "@bloque21/shared";
import { connection } from "next/server";
import { apiError } from "@/server/http";
import { fetchUsdMxn } from "@/server/market/sources/binance";

/** Tipo de cambio USD/MXN para mostrar precios en pesos y para el conversor. */
export async function GET() {
  await connection();

  let fx;
  try {
    fx = await fetchUsdMxn();
  } catch (error) {
    console.error("fx: Binance no respondió", error);
    return apiError("source_unavailable", "El tipo de cambio no está disponible por ahora.", { retryAfter: 60 });
  }

  const body = FxResponseSchema.parse({
    data: { usdMxn: fx.rate, asOf: fx.asOf.toISOString(), source: "binance" },
    meta: { generatedAt: new Date().toISOString() },
  });
  return Response.json(body, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
