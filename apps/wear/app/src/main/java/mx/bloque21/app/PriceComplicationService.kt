package mx.bloque21.app

import android.app.PendingIntent
import android.content.Intent
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService

/** Complication para la carátula: precio corto de la moneda principal y su símbolo. */
class PriceComplicationService : SuspendingComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? =
        if (type == ComplicationType.SHORT_TEXT) build("BTC", "72.9K", "Bitcoin a 72,900 dólares") else null

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        if (request.complicationType != ComplicationType.SHORT_TEXT) return null
        val coin = Settings.primaryCoin(this)
        val (snapshot, _) = Market.refreshOrCached(this)
        val quote = snapshot?.quote(coin.id) ?: return build(coin.symbol, "--", "${coin.name} sin datos todavía")
        val (amount, currency) = displayAmount(quote.priceUsd, Settings.currency(this), snapshot.usdMxn)
        val text = formatCompact(amount)
        val unit = if (currency == Currency.MXN) "pesos" else "dólares"
        val stale = if (quote.isStale()) ", dato viejo" else ""
        return build(coin.symbol, text, "${coin.name} a $text $unit, ${formatSignedPercent(quote.change24hPct)}$stale")
    }

    private fun build(title: String, text: String, description: String): ComplicationData {
        val open = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return ShortTextComplicationData.Builder(PlainComplicationText.Builder(text).build(), PlainComplicationText.Builder(description).build())
            .setTitle(PlainComplicationText.Builder(title).build())
            .setTapAction(open)
            .build()
    }
}
