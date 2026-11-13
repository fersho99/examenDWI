import type { Metadata } from "next";
import { PortfolioScreen } from "./portfolio-screen";

export const metadata: Metadata = { title: "Portafolio" };

/** Versión de la APK: los datos viven en el teléfono, sin cuenta ni servidor. */
export default function MobilePortfolioScreenPage() {
  return (
    <main className="safe-area mx-auto w-full max-w-xl flex-1 px-4">
      <PortfolioScreen />
    </main>
  );
}
