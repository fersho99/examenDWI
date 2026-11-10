package mx.bloque21.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.time.Instant

class PricesContractTest {
    // El mismo archivo que valida Zod en packages/shared: si uno cambia, falla el otro.
    private val fixture = File("../../../packages/shared/fixtures/prices.json")

    @Test
    fun leeElFixtureCompartido() {
        val response = PricesApi.parse(fixture.readText())
        assertEquals(3, response.data.prices.size)
        assertEquals("bitcoin", response.data.prices[0].coinId)
        assertNull(response.data.prices[2].change24hPct)
        assertTrue(response.data.prices[2].stale)
    }

    @Test
    fun formateaComoLaWeb() {
        assertEquals("$76,121", formatPriceUsd(76121.01))
        assertEquals("$90.18", formatPriceUsd(90.18))
        assertEquals("$0.07215", formatPriceUsd(0.07215))
        assertEquals("−4.10%", formatSignedPercent(-4.1))
        assertEquals("+1.24%", formatSignedPercent(1.236))
    }

    @Test
    fun cuentaLaFrescuraDesdeElDato() {
        val now = Instant.parse("2026-11-10T18:30:00Z")
        assertEquals("Hace 15 min", freshness("2026-11-10T18:15:00Z", false, now))
        assertEquals("Hace un momento", freshness("2026-11-10T18:29:50Z", false, now))
        assertEquals("Último dato 12:15", freshness("2026-11-10T18:15:00Z", true, now))
    }
}
