package mx.bloque21.app

import android.content.ComponentName
import android.content.Context
import androidx.wear.tiles.TileService
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester

/** Pide al sistema que vuelva a dibujar el tile y la complication con los datos guardados. */
fun refreshSurfaces(context: Context) {
    TileService.getUpdater(context).requestUpdate(PriceTileService::class.java)
    ComplicationDataSourceUpdateRequester
        .create(context, ComponentName(context, PriceComplicationService::class.java))
        .requestUpdateAll()
}
