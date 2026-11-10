import { connection } from "next/server";
import { getDb } from "@/server/db/client";
import { env } from "@/server/env";
import { apiError, hasBearerSecret } from "@/server/http";
import { runIngest } from "@/server/market/ingest";

export const maxDuration = 60;

/**
 * Ingesta de velas. La llama el programador externo cada 15 min (POST)
 * o el cron de Vercel (GET), siempre con Authorization: Bearer CRON_SECRET.
 */
async function handle(request: Request) {
  await connection();

  let secret: string;
  try {
    secret = env("CRON_SECRET");
  } catch {
    return apiError("internal", "La ingesta no está configurada en este entorno.");
  }
  if (!hasBearerSecret(request, secret)) {
    return apiError("unauthorized", "Credencial de ingesta inválida.");
  }

  let summary;
  try {
    summary = await runIngest(getDb(env("DATABASE_URL")));
  } catch (error) {
    console.error("ingest: fallo general", error);
    return apiError("internal", "La ingesta falló antes de terminar; revisa los registros.");
  }
  const status = summary.candlesWritten === 0 && summary.failures.length > 0 ? 502 : 200;
  return Response.json({ data: summary }, { status, headers: { "cache-control": "no-store" } });
}

export const GET = handle;
export const POST = handle;
