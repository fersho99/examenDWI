import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { loadPrices } from "@/server/market/price-service";
import { requireViewer } from "@/server/session";
import { AccountBar } from "./account-bar";
import { LivePrices } from "./live-prices";

export const metadata: Metadata = { title: "Precios" };

/** Pantalla inicial de la app de Android: precios reales de Neon, o de Binance si Neon no responde. */
export default function AppHome() {
  return (
    <main className="safe-area mx-auto w-full max-w-xl flex-1 px-4">
      <Suspense fallback={<PricesSkeleton />}>
        <InitialPrices />
      </Suspense>
    </main>
  );
}

async function InitialPrices() {
  await connection();
  const viewer = await requireViewer("/app");
  const { prices } = await loadPrices().catch((error: unknown) => {
    console.error("app: no se pudieron leer los precios", error);
    return { prices: [] };
  });
  return (
    <>
      <AccountBar viewer={viewer} />
      <LivePrices initial={prices} />
    </>
  );
}

function PricesSkeleton() {
  return (
    <div aria-hidden className="space-y-10">
      <div className="space-y-3">
        <div className="skeleton h-5 w-24" />
        <div className="skeleton h-14 w-64" />
        <div className="skeleton h-5 w-40" />
      </div>
      <div className="space-y-5">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="skeleton h-5 w-28" />
            <div className="skeleton h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
