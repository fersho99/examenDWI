package mx.bloque21.app

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.net.HttpURLConnection
import java.net.URL

/** Mismo contrato que PricesResponseSchema en packages/shared; lo vigila PricesContractTest. */
@Serializable
data class Price(
    val coinId: String,
    val symbol: String,
    val name: String,
    val priceUsd: Double,
    val change24hPct: Double? = null,
    val asOf: String,
    val source: String,
    val stale: Boolean,
)

@Serializable
data class PricesData(val prices: List<Price>)

@Serializable
data class PricesMeta(val generatedAt: String)

@Serializable
data class PricesResponse(val data: PricesData, val meta: PricesMeta)

class ApiException(val status: Int) : Exception("La API respondió $status")

object PricesApi {
    /** Las monedas del reloj mientras no exista la vinculación con el teléfono. */
    const val IDS = "bitcoin,ethereum,solana"

    private val json = Json { ignoreUnknownKeys = true }

    fun parse(body: String): PricesResponse = json.decodeFromString(body)

    suspend fun fetch(baseUrl: String = BuildConfig.API_BASE_URL): PricesResponse =
        withContext(Dispatchers.IO) {
            val connection = URL("$baseUrl/api/v1/prices?ids=$IDS").openConnection() as HttpURLConnection
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            connection.setRequestProperty("Accept", "application/json")
            try {
                val status = connection.responseCode
                if (status !in 200..299) throw ApiException(status)
                connection.inputStream.bufferedReader().use { parse(it.readText()) }
            } finally {
                connection.disconnect()
            }
        }
}
