package mx.bloque21.app

import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.DimensionBuilders.expand
import androidx.wear.protolayout.DimensionBuilders.sp
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.ModifiersBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import com.google.common.util.concurrent.ListenableFuture
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.guava.future

private const val RESOURCES_VERSION = "1"

/** El sistema vuelve a pedir el tile cada 15 min como mínimo; ahorra batería frente a algo más frecuente. */
private const val FRESHNESS_MS = 15 * 60_000L

private const val CREAM = 0xFFF6F0E6.toInt()
private const val SAND = 0xFFBDB3A2.toInt()
private const val UP = 0xFF4FD8A5.toInt()
private const val DOWN = 0xFFFF7A6B.toInt()

/** Tile de la moneda principal: precio grande, variación, rango del día y antigüedad del dato. */
class PriceTileService : TileService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> =
        scope.future {
            val (snapshot, offline) = Market.refreshOrCached(this@PriceTileService)
            TileBuilders.Tile.Builder()
                .setResourcesVersion(RESOURCES_VERSION)
                .setFreshnessIntervalMillis(FRESHNESS_MS)
                .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(layout(snapshot, offline)))
                .build()
        }

    override fun onTileResourcesRequest(
        requestParams: RequestBuilders.ResourcesRequest,
    ): ListenableFuture<ResourceBuilders.Resources> =
        scope.future { ResourceBuilders.Resources.Builder().setVersion(RESOURCES_VERSION).build() }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }

    private fun layout(snapshot: Snapshot?, offline: Boolean): LayoutElementBuilders.LayoutElement {
        val coin = Settings.primaryCoin(this)
        val currency = Settings.currency(this)
        val quote = snapshot?.quote(coin.id)
        val column = LayoutElementBuilders.Column.Builder()
            .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)

        if (snapshot == null || quote == null) {
            column.addContent(text("Abre Bloque 21 para cargar el precio", 14f, SAND))
        } else {
            val shown = displayAmount(quote.priceUsd, currency, snapshot.usdMxn).second
            column.addContent(text("${coin.name} en ${shown.name}", 13f, SAND))
            column.addContent(text(formatMoney(quote.priceUsd, currency, snapshot.usdMxn), 26f, CREAM, bold = true))
            column.addContent(text(formatSignedPercent(quote.change24hPct), 15f, if (quote.change24hPct >= 0) UP else DOWN))
            column.addContent(
                text(
                    "${formatMoney(quote.lowUsd, currency, snapshot.usdMxn)} a ${formatMoney(quote.highUsd, currency, snapshot.usdMxn)}",
                    11f,
                    SAND,
                ),
            )
            column.addContent(spacer(4f))
            val stale = quote.isStale() || offline
            val age = freshness(quote.asOf, stale)
            column.addContent(text(if (offline) "Sin red. $age" else age, 11f, if (stale) DOWN else SAND))
        }

        return LayoutElementBuilders.Box.Builder()
            .setWidth(expand())
            .setHeight(expand())
            .setModifiers(openApp())
            .addContent(column.build())
            .build()
    }

    private fun openApp() = ModifiersBuilders.Modifiers.Builder()
        .setClickable(
            ModifiersBuilders.Clickable.Builder()
                .setId("open_app")
                .setOnClick(
                    ActionBuilders.LaunchAction.Builder()
                        .setAndroidActivity(
                            ActionBuilders.AndroidActivity.Builder()
                                .setPackageName(packageName)
                                .setClassName(MainActivity::class.java.name)
                                .build(),
                        )
                        .build(),
                )
                .build(),
        )
        .build()

    private fun spacer(heightDp: Float) =
        LayoutElementBuilders.Spacer.Builder().setHeight(dp(heightDp)).build()

    private fun text(value: String, sizeSp: Float, color: Int, bold: Boolean = false) =
        LayoutElementBuilders.Text.Builder()
            .setText(value)
            .setMaxLines(2)
            .setFontStyle(
                LayoutElementBuilders.FontStyle.Builder()
                    .setSize(sp(sizeSp))
                    .setColor(argb(color))
                    .setWeight(
                        if (bold) LayoutElementBuilders.FONT_WEIGHT_BOLD else LayoutElementBuilders.FONT_WEIGHT_NORMAL,
                    )
                    .build(),
            )
            .build()
}
