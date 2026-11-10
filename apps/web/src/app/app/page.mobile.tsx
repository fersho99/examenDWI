import type { Metadata } from "next";
import { LivePrices } from "./live-prices";

export const metadata: Metadata = { title: "Precios" };

/** Pantalla inicial de la APK: sin servidor, los precios llegan de Binance desde el teléfono. */
export default function MobileHome() {
  return (
    <main className="safe-area mx-auto w-full max-w-xl flex-1 px-4">
      <LivePrices initial={[]} />
    </main>
  );
}
