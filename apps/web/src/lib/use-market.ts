"use client";

import { useEffect, useRef, useState } from "react";
import type { Market, MarketResponse, Sentiment } from "./types";

const REFRESH_MS = 20_000;

export type Tick = "up" | "down" | null;

export function useMarket(
  initialMarket: Market | null,
  initialSentiment: Sentiment | null = null,
) {
  const [market, setMarket] = useState(initialMarket);
  const [sentiment, setSentiment] = useState(initialSentiment);
  const [tick, setTick] = useState<Tick>(null);
  const [offline, setOffline] = useState(false);
  const lastPrice = useRef(initialMarket?.priceUsd ?? null);

  useEffect(() => {
    let tickTimer: ReturnType<typeof setTimeout>;

    async function refresh() {
      if (document.hidden) return;

      try {
        const response = await fetch("/api/bitcoin");
        if (!response.ok) throw new Error(String(response.status));

        const next = (await response.json()) as MarketResponse;
        const previous = lastPrice.current;
        lastPrice.current = next.market.priceUsd;

        setMarket(next.market);
        setSentiment(next.sentiment);
        setOffline(next.market.stale);

        if (previous !== null && previous !== next.market.priceUsd) {
          setTick(next.market.priceUsd > previous ? "up" : "down");
          clearTimeout(tickTimer);
          tickTimer = setTimeout(() => setTick(null), 160);
        }
      } catch {
        setOffline(true);
      }
    }

    const interval = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      clearInterval(interval);
      clearTimeout(tickTimer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return { market, sentiment, tick, offline };
}
