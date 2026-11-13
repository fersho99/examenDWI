import type { Metadata } from "next";
import { Suspense } from "react";
import { Guard, ScreenSkeleton } from "../guard";
import { PortfolioScreen } from "./portfolio-screen";

export const metadata: Metadata = { title: "Portafolio" };

export default function PortfolioPage() {
  return (
    <main className="safe-area mx-auto w-full max-w-xl flex-1 px-4">
      <Suspense fallback={<ScreenSkeleton />}>
        <Guard next="/app/portafolio">
          <PortfolioScreen />
        </Guard>
      </Suspense>
    </main>
  );
}
