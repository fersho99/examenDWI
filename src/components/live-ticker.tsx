"use client";

import { Change } from "./change";
import { LiveStatus } from "./live-status";
import { formatFiat, formatUsd } from "@/lib/format";
import type { Market } from "@/lib/types";
import { useMarket } from "@/lib/use-market";

export function LiveTicker({ initial }: { initial: Market | null }) {
  const { market, tick, offline } = useMarket(initial);

  if (!market) {
    return (
      <p className="text-sand">
        El precio no está disponible por ahora. Reintentamos en unos segundos.
      </p>
    );
  }

  return (
    <div>
      <LiveStatus updatedAt={market.updatedAt} offline={offline || market.stale} />
      <p
        data-tick={tick ?? undefined}
        className="price-figure mt-3 text-5xl font-semibold tracking-tight sm:text-6xl"
      >
        {formatUsd(market.priceUsd)}
      </p>
      <p className="mt-3">
        <Change value={market.change24h} suffix="24h" />
      </p>
      {market.details && (
        <p className="mt-2 text-sand">
          {formatFiat(market.priceUsd * market.details.mxnPerUsd, "MXN")} MXN
        </p>
      )}
    </div>
  );
}
