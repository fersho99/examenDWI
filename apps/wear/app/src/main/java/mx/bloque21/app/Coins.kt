package mx.bloque21.app

import androidx.compose.ui.graphics.Color

/** Mismas monedas y tintas que INITIAL_COINS en packages/shared. */
data class Coin(val id: String, val symbol: String, val name: String, val binanceSymbol: String, val tint: Color)

val COINS = listOf(
    Coin("bitcoin", "BTC", "Bitcoin", "BTCUSDT", Color(0xFFF7931A)),
    Coin("ethereum", "ETH", "Ethereum", "ETHUSDT", Color(0xFFA9B4F5)),
    Coin("solana", "SOL", "Solana", "SOLUSDT", Color(0xFFC79BF2)),
    Coin("binancecoin", "BNB", "BNB", "BNBUSDT", Color(0xFFE6C84F)),
    Coin("ripple", "XRP", "XRP", "XRPUSDT", Color(0xFFA8BCCB)),
    Coin("cardano", "ADA", "Cardano", "ADAUSDT", Color(0xFF7FB2EE)),
    Coin("dogecoin", "DOGE", "Dogecoin", "DOGEUSDT", Color(0xFFD8B878)),
    Coin("chainlink", "LINK", "Chainlink", "LINKUSDT", Color(0xFF8EA6F7)),
    Coin("avalanche-2", "AVAX", "Avalanche", "AVAXUSDT", Color(0xFFE88FA8)),
    Coin("the-open-network", "TON", "Toncoin", "TONUSDT", Color(0xFF6CC4EA)),
)

fun coinById(id: String): Coin = COINS.firstOrNull { it.id == id } ?: COINS.first()

/** Par de Binance para el tipo de cambio: USDT sigue al dólar. */
const val FX_SYMBOL = "USDTMXN"
