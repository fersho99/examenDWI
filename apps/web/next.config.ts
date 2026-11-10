import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@bloque21/shared"],
  serverExternalPackages: ["@neondatabase/serverless", "@node-rs/argon2"],
  // El panel anterior se reemplazó por /app.
  redirects: async () => [{ source: "/dashboard/:path*", destination: "/app", permanent: false }],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
