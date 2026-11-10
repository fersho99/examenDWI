import { connection, NextResponse } from "next/server";
import { getMarket, getSentiment } from "@/lib/bitcoin";

export async function GET() {
  await connection();

  const [market, sentiment] = await Promise.all([getMarket(), getSentiment()]);

  if (!market) {
    return NextResponse.json(
      { error: "Datos de mercado no disponibles" },
      { status: 503 },
    );
  }

  return NextResponse.json({ market, sentiment });
}
