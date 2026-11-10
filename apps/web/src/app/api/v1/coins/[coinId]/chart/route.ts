import { ChartDaysSchema, ChartResponseSchema, CoinIdSchema } from "@bloque21/shared";
import { connection, type NextRequest } from "next/server";
import { apiError } from "@/server/http";
import { loadChart } from "@/server/market/chart-service";

export async function GET(request: NextRequest, { params }: RouteContext<"/api/v1/coins/[coinId]/chart">) {
  await connection();

  const coinId = CoinIdSchema.safeParse((await params).coinId);
  const days = ChartDaysSchema.safeParse(request.nextUrl.searchParams.get("days"));
  if (!coinId.success || !days.success) {
    return apiError("invalid_input", "Moneda o rango no válidos. Rangos: 1, 7, 30, 90 o 365 días.");
  }

  let result;
  try {
    result = await loadChart(coinId.data, days.data);
  } catch (error) {
    console.error("chart: ni Neon ni Binance respondieron", error);
    return apiError("source_unavailable", "El historial no está disponible por ahora.", { retryAfter: 30 });
  }

  if (result.points.length < 2) {
    return apiError("not_found", "Todavía no hay historial para esta moneda.");
  }

  const body = ChartResponseSchema.parse({
    data: { coinId: coinId.data, days: days.data, points: result.points },
    meta: { generatedAt: new Date().toISOString(), servedFrom: result.servedFrom },
  });

  return Response.json(body, {
    headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
