import { cacheLife } from "next/cache";
import type {
  ChartPoint,
  ChartRange,
  Market,
  MarketDetails,
  Sentiment,
} from "./types";

const BINANCE = "https://data-api.binance.vision/api/v3";
const COINGECKO = "https://api.coingecko.com/api/v3";
const FEAR_GREED = "https://api.alternative.me/fng/?limit=1";

const CANDLES: Record<ChartRange, { interval: string; limit: number }> = {
  "1": { interval: "5m", limit: 288 },
  "7": { interval: "1h", limit: 168 },
  "30": { interval: "4h", limit: 180 },
  "90": { interval: "12h", limit: 180 },
  "365": { interval: "1d", limit: 365 },
};

const SENTIMENT_LABELS: Record<string, string> = {
  "Extreme Fear": "Miedo extremo",
  Fear: "Miedo",
  Neutral: "Neutral",
  Greed: "Codicia",
  "Extreme Greed": "Codicia extrema",
};

interface TickerResponse {
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  closeTime: number;
}

interface CoinResponse {
  market_data: {
    current_price: { usd: number; mxn: number; eur: number };
    market_cap: { usd: number };
    total_volume: { usd: number };
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    price_change_percentage_1y: number;
    circulating_supply: number;
    max_supply: number;
    ath: { usd: number };
    ath_change_percentage: { usd: number };
    ath_date: { usd: string };
  };
}

type Ticker = Omit<Market, "details" | "stale">;

// Si una API falla o limita las consultas, se conserva el último dato bueno.
let lastTicker: Ticker | null = null;
let lastDetails: MarketDetails | null = null;
let lastSentiment: Sentiment | null = null;
const lastCharts = new Map<ChartRange, ChartPoint[]>();

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`${url} respondió ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function getTicker(): Promise<{ ticker: Ticker | null; stale: boolean }> {
  "use cache";

  try {
    const data = await fetchJson<TickerResponse>(
      `${BINANCE}/ticker/24hr?symbol=BTCUSDT`,
    );
    cacheLife({ stale: 10, revalidate: 15, expire: 60 });

    lastTicker = {
      priceUsd: Number(data.lastPrice),
      change24h: Number(data.priceChangePercent),
      high24h: Number(data.highPrice),
      low24h: Number(data.lowPrice),
      updatedAt: data.closeTime,
    };
    return { ticker: lastTicker, stale: false };
  } catch {
    cacheLife({ stale: 5, revalidate: 10, expire: 30 });
    return { ticker: lastTicker, stale: true };
  }
}

async function getDetails(): Promise<MarketDetails | null> {
  "use cache";

  try {
    const { market_data: data } = await fetchJson<CoinResponse>(
      `${COINGECKO}/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
    );
    cacheLife({ stale: 60, revalidate: 240, expire: 290 });

    lastDetails = {
      marketCapUsd: data.market_cap.usd,
      volumeUsd: data.total_volume.usd,
      mxnPerUsd: data.current_price.mxn / data.current_price.usd,
      eurPerUsd: data.current_price.eur / data.current_price.usd,
      change7d: data.price_change_percentage_7d,
      change30d: data.price_change_percentage_30d,
      change1y: data.price_change_percentage_1y,
      circulatingSupply: data.circulating_supply,
      maxSupply: data.max_supply,
      athUsd: data.ath.usd,
      athChange: data.ath_change_percentage.usd,
      athDate: data.ath_date.usd,
    };
    return lastDetails;
  } catch {
    cacheLife({ stale: 10, revalidate: 30, expire: 60 });
    return lastDetails;
  }
}

export async function getMarket(): Promise<Market | null> {
  const [{ ticker, stale }, details] = await Promise.all([
    getTicker(),
    getDetails(),
  ]);

  return ticker ? { ...ticker, stale, details } : null;
}

export async function getChart(range: ChartRange): Promise<ChartPoint[]> {
  "use cache";

  const { interval, limit } = CANDLES[range];

  try {
    const candles = await fetchJson<[number, string, string, string, string][]>(
      `${BINANCE}/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`,
    );
    cacheLife({ stale: 30, revalidate: 60, expire: 280 });

    const points = candles.map<ChartPoint>(([openTime, , , , close]) => [
      openTime,
      Number(close),
    ]);
    lastCharts.set(range, points);
    return points;
  } catch {
    cacheLife({ stale: 5, revalidate: 10, expire: 30 });
    return lastCharts.get(range) ?? [];
  }
}

export async function getSentiment(): Promise<Sentiment | null> {
  "use cache";

  try {
    const { data } = await fetchJson<{
      data: { value: string; value_classification: string }[];
    }>(FEAR_GREED);
    cacheLife({ stale: 60, revalidate: 240, expire: 280 });

    const [latest] = data;
    lastSentiment = {
      value: Number(latest.value),
      label:
        SENTIMENT_LABELS[latest.value_classification] ??
        latest.value_classification,
    };
    return lastSentiment;
  } catch {
    cacheLife({ stale: 5, revalidate: 15, expire: 30 });
    return lastSentiment;
  }
}
