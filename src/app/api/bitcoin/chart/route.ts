import { NextResponse, type NextRequest } from "next/server";
import { getChart } from "@/lib/bitcoin";
import { isChartRange } from "@/lib/types";

export async function GET(request: NextRequest) {
  const days = request.nextUrl.searchParams.get("days");

  if (!isChartRange(days)) {
    return NextResponse.json({ error: "Rango no válido" }, { status: 400 });
  }

  const points = await getChart(days);

  if (points.length === 0) {
    return NextResponse.json(
      { error: "Historial no disponible" },
      { status: 503 },
    );
  }

  return NextResponse.json({ points });
}
