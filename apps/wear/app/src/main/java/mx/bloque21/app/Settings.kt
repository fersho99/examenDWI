package mx.bloque21.app

import android.content.Context

enum class Currency { MXN, USD }

/** Alerta del reloj: avisa si la moneda se mueve más de cierto porcentaje en 24 h. */
data class WatchAlert(val coinId: String, val thresholdPct: Int, val armed: Boolean, val lastFiredAt: Long)

/** Porcentajes que se eligen con un toque: en el reloj no hay teclado. */
val ALERT_STEPS = listOf(2, 3, 5, 10)

/** Preferencias del reloj, guardadas en el propio reloj. */
object Settings {
    private const val FILE = "settings"

    private fun prefs(context: Context) = context.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun primaryCoin(context: Context): Coin = coinById(prefs(context).getString("primary", COINS.first().id)!!)

    fun setPrimaryCoin(context: Context, coinId: String) {
        prefs(context).edit().putString("primary", coinId).apply()
    }

    fun currency(context: Context): Currency =
        runCatching { Currency.valueOf(prefs(context).getString("currency", Currency.MXN.name)!!) }
            .getOrDefault(Currency.MXN)

    fun setCurrency(context: Context, currency: Currency) {
        prefs(context).edit().putString("currency", currency.name).apply()
    }

    fun alert(context: Context, coinId: String): WatchAlert? {
        val prefs = prefs(context)
        val threshold = prefs.getInt("alert.$coinId.pct", 0)
        if (threshold <= 0) return null
        return WatchAlert(
            coinId = coinId,
            thresholdPct = threshold,
            armed = prefs.getBoolean("alert.$coinId.armed", true),
            lastFiredAt = prefs.getLong("alert.$coinId.fired", 0L),
        )
    }

    fun alerts(context: Context): List<WatchAlert> = COINS.mapNotNull { alert(context, it.id) }

    fun saveAlert(context: Context, alert: WatchAlert) {
        prefs(context).edit()
            .putInt("alert.${alert.coinId}.pct", alert.thresholdPct)
            .putBoolean("alert.${alert.coinId}.armed", alert.armed)
            .putLong("alert.${alert.coinId}.fired", alert.lastFiredAt)
            .apply()
    }

    fun removeAlert(context: Context, coinId: String) {
        prefs(context).edit().remove("alert.$coinId.pct").remove("alert.$coinId.armed").remove("alert.$coinId.fired").apply()
    }
}
