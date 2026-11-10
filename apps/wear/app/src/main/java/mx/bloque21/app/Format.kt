package mx.bloque21.app

import java.text.NumberFormat
import java.time.Duration
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

fun formatPriceUsd(value: Double): String {
    val digits = priceDigits(value)
    val number = NumberFormat.getNumberInstance(mexico).apply {
        minimumFractionDigits = digits
        maximumFractionDigits = digits
    }
    return "$" + number.format(value)
}

fun formatSignedPercent(value: Double): String {
    val sign = when {
        value > 0 -> "+"
        value < 0 -> "−"
        else -> ""
    }
    return sign + String.format(Locale.US, "%.2f%%", abs(value))
}

/** Hora real del dato, contada desde el reloj del dispositivo. */
fun freshness(asOf: String, stale: Boolean, now: Instant = Instant.now()): String {
    val at = Instant.parse(asOf)
    if (stale) return "Último dato ${clock.format(at)}"
    val minutes = (Duration.between(at, now).toSeconds() / 60.0).roundToLong().coerceAtLeast(0)
    return if (minutes < 1) "Hace un momento" else "Hace $minutes min"
}
