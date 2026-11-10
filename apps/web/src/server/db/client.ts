import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

let db: Db | null = null;

/**
 * Conexión pooled por HTTP. Se crea al primer uso para que compilar no exija la variable.
 * Las migraciones usan la conexión directa desde drizzle.config.ts.
 */
export function getDb(url = process.env.DATABASE_URL): Db {
  if (db) return db;
  if (!url) throw new Error("Falta DATABASE_URL");
  db = drizzle({ client: neon(url), schema });
  return db;
}
