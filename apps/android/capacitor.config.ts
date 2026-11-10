import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor compila este archivo a CommonJS, por eso __dirname.
const envFile = join(__dirname, "../../.env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

/**
 * La app carga la web desplegada (decisión 1 del plan).
 * dev:  http://localhost:3000/app, que llega al teléfono con `adb reverse tcp:3000 tcp:3000`.
 * prod: BLOQUE21_URL + /app, por ejemplo https://bloque21.vercel.app/app.
 */
const mode = process.env.BLOQUE21_ENV === "dev" ? "dev" : "prod";
const origin = mode === "dev" ? "http://localhost:3000" : process.env.BLOQUE21_URL?.replace(/\/+$/, "");

if (!origin) {
  throw new Error("Falta BLOQUE21_URL en .env.local (o usa BLOQUE21_ENV=dev para el servidor local).");
}
if (mode === "prod" && !origin.startsWith("https://")) {
  throw new Error("BLOQUE21_URL debe usar https en modo prod.");
}
const url = `${origin}/app`;

const config: CapacitorConfig = {
  appId: "mx.bloque21.app",
  appName: "Bloque 21",
  webDir: "www",
  backgroundColor: "#14110d",
  server: {
    url,
    // Texto plano solo para el servidor local de desarrollo.
    cleartext: mode === "dev",
    // Página local cuando no se puede cargar el servidor; no tiene acceso a plugins.
    errorPath: "offline.html",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
