import { INITIAL_COINS } from "@bloque21/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { CoinDetail } from "./coin-detail";

/** La APK incluye una página por cada moneda inicial. */
export function generateStaticParams() {
  return INITIAL_COINS.map((coin) => ({ coinId: coin.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/app/[coinId]">): Promise<Metadata> {
  const { coinId } = await params;
  const coin = INITIAL_COINS.find((item) => item.id === coinId);
  return { title: coin ? `${coin.name} (${coin.symbol})` : "Moneda" };
}

export default async function MobileCoinPage({ params }: PageProps<"/app/[coinId]">) {
  const { coinId } = await params;
  const coin = INITIAL_COINS.find((item) => item.id === coinId) ?? INITIAL_COINS[0];
  return (
    <main className="safe-area mx-auto w-full max-w-xl flex-1 px-4">
      <Link href="/app/" className="press -ml-2 inline-flex min-h-12 items-center rounded-full px-2 text-sand hover:text-cream">
        <span aria-hidden className="mr-1">‹</span> Monedas
      </Link>
      <CoinDetail
        coin={{ id: coin.id, name: coin.name, symbol: coin.symbol, tint: coin.tint }}
        initialPrice={null}
        initialDays="7"
        initialPoints={[]}
      />
    </main>
  );
}
