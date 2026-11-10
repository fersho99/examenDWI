import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

const envFile = new URL("../../.env.local", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

const url = process.env.DATABASE_URL_UNPOOLED;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
  // generate no necesita base de datos; migrate sí, y por conexión directa.
  ...(url ? { dbCredentials: { url } } : {}),
});
