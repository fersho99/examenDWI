import type { Metadata } from "next";
import { AlertsScreen } from "./alerts-screen";

export const metadata: Metadata = { title: "Alertas" };

/** Versión de la APK: los datos viven en el teléfono, sin cuenta ni servidor. */
export default function MobileAlertsScreenPage() {
  return (
    <main className="safe-area mx-auto w-full max-w-xl flex-1 px-4">
      <AlertsScreen />
    </main>
  );
}
