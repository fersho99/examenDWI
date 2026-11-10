import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor compila este archivo a CommonJS, por eso __dirname.
const envFile = join(__dirname, "../../.env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

/**
 * Por defecto la APK es independiente: lleva dentro las pantallas (export estático de
 * apps/web con BUILD_TARGET=mobile) y lee los precios de Binance desde el teléfono.
 * Con BLOQUE21_ENV=dev carga el servidor local de tu PC por `adb reverse`, para desarrollar
 * con recarga en vivo.
 */
const dev = process.env.BLOQUE21_ENV === "dev";

const config: CapacitorConfig = {
  appId: "mx.bloque21.app",
  appName: "Bloque 21",
  webDir: dev ? "www" : "../web/.next-mobile",
  backgroundColor: "#14110d",
  ...(dev
    ? {
        server: {
          url: "http://localhost:3000/app",
          // Texto plano solo para el servidor local de desarrollo.
          cleartext: true,
          errorPath: "offline.html",
        },
      }
    : {}),
  android: {
    allowMixedContent: false,
  },
};

export default config;
