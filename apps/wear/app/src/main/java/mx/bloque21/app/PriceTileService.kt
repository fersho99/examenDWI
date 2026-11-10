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

/** Tile de precio de la moneda principal: precio grande, variación y antigüedad real del dato. */
class PriceTileService : TileService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> =
        scope.future {
            val fresh = runCatching { PricesApi.fetch().data.prices.firstOrNull() }.getOrNull()
            fresh?.let { LastPrice.save(this@PriceTileService, it) }
            val price = fresh ?: LastPrice.load(this@PriceTileService)

            TileBuilders.Tile.Builder()
                .setResourcesVersion(RESOURCES_VERSION)
                .setFreshnessIntervalMillis(FRESHNESS_MS)
                .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(layout(price, offline = fresh == null)))
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

    private fun layout(price: Price?, offline: Boolean): LayoutElementBuilders.LayoutElement {
        val column = LayoutElementBuilders.Column.Builder()
            .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)

        if (price == null) {
            column.addContent(text("Abre Bloque 21 para cargar el precio", 14f, SAND))
        } else {
            val change = price.change24hPct
            column.addContent(text(price.name, 14f, SAND))
            column.addContent(text(formatPriceUsd(price.priceUsd), 30f, CREAM, bold = true))
            if (change != null) {
                column.addContent(text(formatSignedPercent(change), 15f, if (change >= 0) UP else DOWN))
            }
            column.addContent(spacer(6f))
            val age = freshness(price.asOf, price.stale || offline)
            column.addContent(text(if (offline) "Sin red. $age" else age, 12f, if (offline || price.stale) DOWN else SAND))
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
