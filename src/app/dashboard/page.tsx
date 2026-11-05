import type { Metadata } from "next";
import { Suspense } from "react";
import { logout } from "../login/actions";
import { DashboardView } from "./dashboard-view";
import { Footer } from "@/components/footer";
import { LogoutIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { getChart, getMarket, getSentiment } from "@/lib/bitcoin";
import { DEMO_USER } from "@/lib/session";

export const metadata: Metadata = { title: "Panel" };

export default function DashboardPage() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-sand sm:inline">
              {DEMO_USER.name}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="press inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium hover:border-btc hover:text-btc"
              >
                <LogoutIcon className="size-4" />
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-12">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardData />
        </Suspense>
      </main>

      <Footer />
    </>
  );
}

async function DashboardData() {
  const [market, chart, sentiment] = await Promise.all([
    getMarket(),
    getChart("7"),
    getSentiment(),
  ]);

  return (
    <DashboardView
      initialMarket={market}
      initialChart={chart}
      initialSentiment={sentiment}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Cargando datos del mercado">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton h-16 w-72 max-w-full" />
      <div className="skeleton h-80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
      </div>
    </div>
  );
}
