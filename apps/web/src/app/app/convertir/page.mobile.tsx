import type { Metadata } from "next";
import { ConverterScreen } from "./converter-screen";

export const metadata: Metadata = { title: "Convertir" };

/** Versión de la APK: los datos viven en el teléfono, sin cuenta ni servidor. */
export default function MobileConverterScreenPage() {
  return (
    <main className="safe-area mx-auto w-full max-w-xl flex-1 px-4">
      <ConverterScreen />
    </main>
  );
}
