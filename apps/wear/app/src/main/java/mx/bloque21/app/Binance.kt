package mx.bloque21.app

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * El reloj lee Binance directo por su propia conexión (Wi-Fi o la del teléfono por Bluetooth):
 * no depende de ningún servidor ni de la PC.
 */
object Binance {
    private const val BASE = "https://data-api.binance.vision/api/v3"
    private val json = Json { ignoreUnknownKeys = true }

    @Serializable
    data class Ticker(
        val symbol: String,
        val lastPrice: String,
        val priceChangePercent: String,
        val highPrice: String,
        val lowPrice: String,
        val closeTime: Long,
    )

    fun parseTickers(body: String): List<Ticker> = json.decodeFromString(body)

    /** Cierres de cada vela, del más viejo al más nuevo. */
    fun parseCloses(body: String): List<Double> =
        json.parseToJsonElement(body).jsonArray.map { candle ->
            (candle as JsonArray)[4].jsonPrimitive.content.toDouble()
        }

    /** Hora de apertura de la última vela, para saber de cuándo es la gráfica. */
    fun parseLastOpenTime(body: String): Long? =
        json.parseToJsonElement(body).jsonArray.lastOrNull()?.let { (it as JsonArray)[0].jsonPrimitive.long }

    suspend fun tickers(symbols: List<String>): List<Ticker> {
        val list = symbols.joinToString(",", "[", "]") { "\"$it\"" }
        return parseTickers(get("$BASE/ticker/24hr?symbols=${URLEncoder.encode(list, "UTF-8")}"))
    }

    /** 24 velas de 1 h: la gráfica del último día. */
    suspend fun dayCloses(symbol: String): List<Double> =
        parseCloses(get("$BASE/klines?symbol=$symbol&interval=1h&limit=24"))

    private suspend fun get(url: String): String = withContext(Dispatchers.IO) {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.connectTimeout = 10_000
        connection.readTimeout = 10_000
        connection.setRequestProperty("Accept", "application/json")
        try {
            val status = connection.responseCode
            if (status !in 200..299) throw SourceException(status)
            connection.inputStream.bufferedReader().use { it.readText() }
        } finally {
            connection.disconnect()
        }
    }
}

/** 429 o 418: Binance pide esperar; no se insiste hasta el siguiente ciclo. */
class SourceException(val status: Int) : Exception("Binance respondió $status")
