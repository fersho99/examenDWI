package mx.bloque21.app

import android.content.Context
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class Quote(
    val coinId: String,
    val priceUsd: Double,
    val change24hPct: Double,
    val highUsd: Double,
    val lowUsd: Double,
    /** Momento real del precio según Binance. */
    val asOf: Long,
)

@Serializable
data class Snapshot(
    val quotes: List<Quote>,
    /** Pesos por dólar; null si Binance no devolvió USDT/MXN. */
    val usdMxn: Double?,
    val fetchedAt: Long,
) {
    fun quote(coinId: String): Quote? = quotes.firstOrNull { it.coinId == coinId }
}

/** Un precio de más de 20 min ya no se muestra como actual (igual que en el teléfono). */
const val STALE_AFTER_MS = 20 * 60_000L

fun Quote.isStale(now: Long = System.currentTimeMillis()) = now - asOf > STALE_AFTER_MS

/**
 * Precios de las 10 monedas y el tipo de cambio en una sola llamada a Binance.
 * El último resultado se guarda para que la app, el tile, la complication y las alertas
 * muestren algo real (con su hora) aunque no haya red.
 */
object Market {
    private const val FILE = "market"
    private const val KEY = "snapshot"
    private val json = Json { ignoreUnknownKeys = true }

    fun fromTickers(tickers: List<Binance.Ticker>, now: Long): Snapshot {
        val bySymbol = tickers.associateBy { it.symbol }
        val quotes = COINS.mapNotNull { coin ->
            val ticker = bySymbol[coin.binanceSymbol] ?: return@mapNotNull null
            Quote(
                coinId = coin.id,
                priceUsd = ticker.lastPrice.toDouble(),
                change24hPct = ticker.priceChangePercent.toDouble(),
                highUsd = ticker.highPrice.toDouble(),
                lowUsd = ticker.lowPrice.toDouble(),
                asOf = minOf(ticker.closeTime, now),
            )
        }
        return Snapshot(quotes, bySymbol[FX_SYMBOL]?.lastPrice?.toDouble(), now)
    }

    suspend fun refresh(context: Context): Snapshot {
        val now = System.currentTimeMillis()
        val snapshot = fromTickers(Binance.tickers(COINS.map { it.binanceSymbol } + FX_SYMBOL), now)
        save(context, snapshot)
        return snapshot
    }

    /** Intenta actualizar; si falla, devuelve lo último guardado y avisa que no hubo red. */
    suspend fun refreshOrCached(context: Context): Pair<Snapshot?, Boolean> =
        try {
            refresh(context) to false
        } catch (error: Exception) {
            cached(context) to true
        }

    fun cached(context: Context): Snapshot? {
        val stored = context.getSharedPreferences(FILE, Context.MODE_PRIVATE).getString(KEY, null) ?: return null
        return runCatching { json.decodeFromString(Snapshot.serializer(), stored) }.getOrNull()
    }

    private fun save(context: Context, snapshot: Snapshot) {
        context.getSharedPreferences(FILE, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY, json.encodeToString(Snapshot.serializer(), snapshot))
            .apply()
    }
}
