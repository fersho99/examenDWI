import type { Metadata } from "next";
import { Suspense } from "react";
import { Guard, ScreenSkeleton } from "../guard";
import { ConverterScreen } from "./converter-screen";

export const metadata: Metadata = { title: "Convertir" };

export default function ConverterPage() {
  return (
    <main className="safe-area mx-auto w-full max-w-xl flex-1 px-4">
      <Suspense fallback={<ScreenSkeleton />}>
        <Guard next="/app/convertir">
          <ConverterScreen />
        </Guard>
      </Suspense>
    </main>
  );
}
