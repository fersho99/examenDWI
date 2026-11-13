package mx.bloque21.app

import java.text.NumberFormat
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.log10
import kotlin.math.roundToLong

private val mexico: Locale = Locale.forLanguageTag("es-MX")
private val clock: DateTimeFormatter =
    DateTimeFormatter.ofPattern("HH:mm", mexico).withZone(ZoneId.of("America/Mexico_City"))

/** Misma regla que priceDigits en packages/shared: una moneda de centavos nunca se ve como $0. */
fun priceDigits(value: Double): Int {
    val magnitude = abs(value)
    return when {
        magnitude >= 1000 -> 0
        magnitude >= 1 || magnitude == 0.0 -> 2
        else -> (3 - floor(log10(magnitude)).toInt()).coerceIn(2, 8)
    }
}

fun formatNumber(value: Double, digits: Int = priceDigits(value)): String =
    NumberFormat.getNumberInstance(mexico).apply {
        minimumFractionDigits = digits
        maximumFractionDigits = digits
    }.format(value)

fun formatPriceUsd(value: Double): String = "$" + formatNumber(value)

/** En MXN si hay tipo de cambio; si no, se queda en USD para no inventar una conversión. */
fun displayAmount(usd: Double, currency: Currency, usdMxn: Double?): Pair<Double, Currency> =
    if (currency == Currency.MXN && usdMxn != null) usd * usdMxn to Currency.MXN else usd to Currency.USD

fun formatMoney(usd: Double, currency: Currency, usdMxn: Double?): String {
    val (amount, _) = displayAmount(usd, currency, usdMxn)
    // La moneda activa siempre se ve en la pantalla, así que aquí basta el símbolo.
    return "$" + formatNumber(amount)
}

/** Para la carátula, que solo admite unos 7 caracteres: 1.36M, 72.9K, 0.0721. */
fun formatCompact(value: Double): String {
    val magnitude = abs(value)
    return when {
        magnitude >= 1_000_000 -> formatNumber(value / 1_000_000, 2) + "M"
        magnitude >= 10_000 -> formatNumber(value / 1_000, 1) + "K"
        magnitude >= 1_000 -> formatNumber(value, 0)
        magnitude >= 1 -> formatNumber(value, 2)
        else -> formatNumber(value, 4)
    }
}

fun formatSignedPercent(value: Double): String {
    val sign = when {
        value > 0 -> "+"
        value < 0 -> "−"
        else -> ""
    }
    return sign + String.format(Locale.US, "%.2f%%", abs(value))
}

/** Antigüedad real del dato, contada desde el reloj del dispositivo. */
fun freshness(asOf: Long, stale: Boolean, now: Long = System.currentTimeMillis()): String {
    if (stale) return "Último dato ${clock.format(Instant.ofEpochMilli(asOf))}"
    val minutes = ((now - asOf) / 60_000.0).roundToLong().coerceAtLeast(0)
    return if (minutes < 1) "Hace un momento" else "Hace $minutes min"
}
