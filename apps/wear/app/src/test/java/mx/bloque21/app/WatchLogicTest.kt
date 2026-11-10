package mx.bloque21.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class WatchLogicTest {
    // Respuesta real recortada de /api/v3/ticker/24hr (Binance agrega más campos).
    private val tickers = """
        [
          {"symbol":"BTCUSDT","lastPrice":"72904.10","priceChangePercent":"-2.770","highPrice":"75100.00","lowPrice":"72500.00","closeTime":1762797600000,"volume":"1"},
          {"symbol":"DOGEUSDT","lastPrice":"0.07215","priceChangePercent":"0.800","highPrice":"0.073","lowPrice":"0.070","closeTime":1762797600000},
          {"symbol":"USDTMXN","lastPrice":"18.69","priceChangePercent":"0.1","highPrice":"18.7","lowPrice":"18.6","closeTime":1762797600000}
        ]
    """.trimIndent()

    private val klines = """[[1762790400000,"1","2","0.5","100.0","9",1762793999999],[1762794000000,"1","2","0.5","110.5","9",1762797599999]]"""

    @Test
    fun armaElSnapshotConTipoDeCambio() {
        val snapshot = Market.fromTickers(Binance.parseTickers(tickers), now = 1762797700000)
        assertEquals(2, snapshot.quotes.size)
        assertEquals(18.69, snapshot.usdMxn!!, 0.0)
        val btc = snapshot.quote("bitcoin")!!
        assertEquals(72904.10, btc.priceUsd, 0.0)
        assertEquals(-2.77, btc.change24hPct, 1e-9)
        assertNull(snapshot.quote("ethereum"))
    }

    @Test
    fun leeLosCierresDeLaGrafica() {
        assertEquals(listOf(100.0, 110.5), Binance.parseCloses(klines))
    }

    @Test
    fun formateaComoLaWeb() {
        assertEquals("$76,121", formatPriceUsd(76121.01))
        assertEquals("$0.07215", formatPriceUsd(0.07215))
        assertEquals("$1,362,578", formatMoney(72904.1, Currency.MXN, 18.69))
        assertEquals("$72,904", formatMoney(72904.1, Currency.USD, 18.69))
        // Sin tipo de cambio no se inventa la conversión.
        assertEquals("$72,904", formatMoney(72904.1, Currency.MXN, null))
        assertEquals("−4.10%", formatSignedPercent(-4.1))
    }

    @Test
    fun compactaParaLaCaratula() {
        assertEquals("1.36M", formatCompact(1_362_577.0))
        assertEquals("72.9K", formatCompact(72_904.1))
        assertEquals("0.0722", formatCompact(0.07215))
    }

    @Test
    fun cuentaLaFrescuraDesdeElDato() {
        val now = Instant.parse("2026-11-10T18:30:00Z").toEpochMilli()
        assertEquals("Hace 15 min", freshness(now - 15 * 60_000, false, now))
        assertEquals("Último dato 12:15", freshness(now - 15 * 60_000, true, now))
    }

    private val now = 1_800_000_000_000L
    private fun quote(change: Double, age: Long = 0) = Quote("bitcoin", 1.0, change, 1.0, 1.0, now - age)

    @Test
    fun alertaDisparaUnaVezYSeRearma() {
        val alert = WatchAlert("bitcoin", 5, armed = true, lastFiredAt = 0)
        val fired = checkAlert(alert, quote(-6.0), now)
        assertTrue(fired.fired)
        assertFalse(fired.alert.armed)
        assertFalse(checkAlert(fired.alert, quote(-7.0), now + 60 * 60_000).fired)
        assertTrue(checkAlert(fired.alert, quote(1.0), now).alert.armed)
    }

    @Test
    fun alertaRespetaEnfriamientoYPreciosViejos() {
        val recent = WatchAlert("bitcoin", 5, armed = true, lastFiredAt = now - 10 * 60_000)
        assertFalse(checkAlert(recent, quote(-6.0), now).fired)
        val fresh = WatchAlert("bitcoin", 5, armed = true, lastFiredAt = 0)
        assertFalse(checkAlert(fresh, quote(-6.0, age = STALE_AFTER_MS + 1), now).fired)
    }
}
