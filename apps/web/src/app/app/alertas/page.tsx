import type { Metadata } from "next";
import { Suspense } from "react";
import { Guard, ScreenSkeleton } from "../guard";
import { AlertsScreen } from "./alerts-screen";

export const metadata: Metadata = { title: "Alertas" };

export default function AlertsPage() {
  return (
    <main className="safe-area mx-auto w-full max-w-xl flex-1 px-4">
      <Suspense fallback={<ScreenSkeleton />}>
        <Guard next="/app/alertas">
          <AlertsScreen />
        </Guard>
      </Suspense>
    </main>
  );
}
