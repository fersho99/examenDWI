import { INITIAL_COINS } from "@bloque21/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { loadChart } from "@/server/market/chart-service";
import { loadPrices } from "@/server/market/price-service";
import { CoinDetail } from "./coin-detail";

const DEFAULT_DAYS = "7";

export async function generateMetadata({ params }: PageProps<"/app/[coinId]">): Promise<Metadata> {
  const { coinId } = await params;
  const coin = INITIAL_COINS.find((item) => item.id === coinId);
  return { title: coin ? `${coin.name} (${coin.symbol})` : "Moneda" };
}

export default function CoinPage({ params }: PageProps<"/app/[coinId]">) {
  return (
    <main className="safe-area mx-auto w-full max-w-xl flex-1 px-4">
      <Link
        href="/app"
        className="press -ml-2 inline-flex min-h-12 items-center rounded-full px-2 text-sand hover:text-cream"
      >
        <span aria-hidden className="mr-1">‹</span> Monedas
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}

async function Detail({ params }: { params: PageProps<"/app/[coinId]">["params"] }) {
  const { coinId } = await params;
  const coin = INITIAL_COINS.find((item) => item.id === coinId);
  if (!coin) notFound();
  await connection();

  const [prices, chart] = await Promise.all([
    loadPrices([coin.id]).catch(() => ({ prices: [] })),
    loadChart(coin.id, DEFAULT_DAYS).catch(() => ({ points: [] })),
  ]);

  return (
    <CoinDetail
      coin={{ id: coin.id, name: coin.name, symbol: coin.symbol, tint: coin.tint }}
      initialPrice={prices.prices[0] ?? null}
      initialDays={DEFAULT_DAYS}
      initialPoints={chart.points}
    />
  );
}

function DetailSkeleton() {
  return (
    <div aria-hidden className="mt-4 space-y-4">
      <div className="skeleton h-5 w-28" />
      <div className="skeleton h-14 w-60" />
      <div className="skeleton h-11 w-full rounded-full" />
      <div className="skeleton h-64 w-full" />
    </div>
  );
}
