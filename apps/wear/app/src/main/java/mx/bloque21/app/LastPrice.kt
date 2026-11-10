package mx.bloque21.app

import android.content.Context
import kotlinx.serialization.json.Json

/** Último precio recibido, para que el tile muestre algo real (con su hora) aunque no haya red. */
object LastPrice {
    private const val FILE = "last_price"
    private const val KEY = "primary"
    private val json = Json { ignoreUnknownKeys = true }

    fun save(context: Context, price: Price) {
        context.getSharedPreferences(FILE, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY, json.encodeToString(Price.serializer(), price))
            .apply()
    }

    fun load(context: Context): Price? {
        val stored = context.getSharedPreferences(FILE, Context.MODE_PRIVATE).getString(KEY, null) ?: return null
        return runCatching { json.decodeFromString(Price.serializer(), stored) }.getOrNull()
    }
}
