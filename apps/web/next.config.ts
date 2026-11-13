import type { NextConfig } from "next";

const turbopack: NextConfig["turbopack"] = {
  rules: {
    "*.css": {
      loaders: ["@tailwindcss/turbopack"],
      as: "*.css",
    },
  },
};

/**
 * BUILD_TARGET=mobile genera las pantallas de /app como archivos estáticos para empaquetarlos
 * dentro de la APK: solo cuentan las rutas *.mobile.tsx, no hay servidor y los precios se leen
 * de Binance desde el teléfono. Usa su propia carpeta de compilación para no tocar la del
 * servidor de desarrollo.
 */
const mobile: NextConfig = {
  output: "export",
  distDir: ".next-mobile",
  trailingSlash: true,
  pageExtensions: ["mobile.tsx"],
  images: { unoptimized: true },
  transpilePackages: ["@bloque21/shared"],
  env: { NEXT_PUBLIC_DATA_MODE: "direct" },
  // Aquí los tipos de ruta solo incluyen las páginas móviles y marcarían las de la web.
  // `npm run typecheck` revisa todo el proyecto, incluidas estas páginas, con la configuración web.
  typescript: { ignoreBuildErrors: true },
  turbopack,
};

const web: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@bloque21/shared"],
  serverExternalPackages: ["@neondatabase/serverless", "@node-rs/argon2"],
  // El panel anterior se reemplazó por /app.
  redirects: async () => [{ source: "/dashboard/:path*", destination: "/app", permanent: false }],
  turbopack,
};

export default process.env.BUILD_TARGET === "mobile" ? mobile : web;
