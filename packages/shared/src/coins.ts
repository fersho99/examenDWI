/** Monedas con las que arranca la app. El id es el de CoinGecko. */
export interface CoinSeed {
  id: string;
  symbol: string;
  name: string;
  /** Par en Binance contra USDT; null si la moneda no cotiza ahí. */
  binanceSymbol: string | null;
  /** Tinta para gráficas y monograma, con contraste AA sobre los fondos oscuros. */
  tint: string;
}

export const INITIAL_COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", binanceSymbol: "BTCUSDT", tint: "#f7931a" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", binanceSymbol: "ETHUSDT", tint: "#a9b4f5" },
  { id: "solana", symbol: "SOL", name: "Solana", binanceSymbol: "SOLUSDT", tint: "#c79bf2" },
  { id: "binancecoin", symbol: "BNB", name: "BNB", binanceSymbol: "BNBUSDT", tint: "#e6c84f" },
  { id: "ripple", symbol: "XRP", name: "XRP", binanceSymbol: "XRPUSDT", tint: "#a8bccb" },
  { id: "cardano", symbol: "ADA", name: "Cardano", binanceSymbol: "ADAUSDT", tint: "#7fb2ee" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", binanceSymbol: "DOGEUSDT", tint: "#d8b878" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", binanceSymbol: "LINKUSDT", tint: "#8ea6f7" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", binanceSymbol: "AVAXUSDT", tint: "#e88fa8" },
  { id: "the-open-network", symbol: "TON", name: "Toncoin", binanceSymbol: "TONUSDT", tint: "#6cc4ea" },
] as const satisfies readonly CoinSeed[];

export const PRIMARY_COIN_ID = "bitcoin";
