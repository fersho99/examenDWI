package mx.bloque21.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.Text
import kotlinx.coroutines.delay

private val Cream = Color(0xFFF6F0E6)
private val Sand = Color(0xFFBDB3A2)
private val Up = Color(0xFF4FD8A5)
private val Down = Color(0xFFFF7A6B)

/** Mientras la app está abierta y activa se refresca cada 30 s; en segundo plano no consulta. */
private const val REFRESH_MS = 30_000L

private sealed interface UiState {
    data object Loading : UiState
    data class Loaded(val prices: List<Price>, val offline: Boolean) : UiState
    data class Failed(val message: String) : UiState
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                PriceScreen()
            }
        }
    }
}

@Composable
private fun PriceScreen() {
    var state by remember { mutableStateOf<UiState>(UiState.Loading) }
    val lifecycle = LocalLifecycleOwner.current.lifecycle

    LaunchedEffect(lifecycle) {
        lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            while (true) {
                state = try {
                    UiState.Loaded(PricesApi.fetch().data.prices, offline = false)
                } catch (error: Exception) {
                    when (val current = state) {
                        // Se conserva lo último recibido y se avisa que no se pudo actualizar.
                        is UiState.Loaded -> current.copy(offline = true)
                        else -> UiState.Failed(
                            if (error is ApiException) "El servidor respondió ${error.status}" else "Sin conexión",
                        )
                    }
                }
                delay(REFRESH_MS)
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .padding(horizontal = 20.dp),
        contentAlignment = Alignment.Center,
    ) {
        when (val current = state) {
            UiState.Loading -> Message("Leyendo precios…")
            is UiState.Failed -> Message("${current.message}. Reintento en 30 s.")
            is UiState.Loaded -> Prices(current.prices, current.offline)
        }
    }
}

@Composable
private fun Message(text: String) {
    Text(text = text, color = Sand, textAlign = TextAlign.Center, fontSize = 15.sp)
}

@Composable
private fun Prices(prices: List<Price>, offline: Boolean) {
    val primary = prices.firstOrNull() ?: return Message("Aún no hay precios guardados")
    val change = primary.change24hPct

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = primary.name, color = Sand, fontSize = 14.sp)
        Text(
            text = formatPriceUsd(primary.priceUsd),
            color = Cream,
            fontSize = 30.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
        )
        if (change != null) {
            Text(
                text = formatSignedPercent(change),
                color = if (change >= 0) Up else Down,
                fontSize = 15.sp,
                modifier = Modifier.semantics { contentDescription = "${formatSignedPercent(change)} en 24 horas" },
            )
        }
        Spacer(Modifier.height(10.dp))
        prices.drop(1).take(2).forEach { price -> SmallRow(price) }
        Spacer(Modifier.height(8.dp))
        Text(
            text = if (offline) "Sin red. ${freshness(primary.asOf, true)}" else freshness(primary.asOf, primary.stale),
            color = if (offline || primary.stale) Down else Sand,
            fontSize = 12.sp,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun SmallRow(price: Price) {
    Row(
        modifier = Modifier.fillMaxWidth(0.8f),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(text = price.symbol, color = Sand, fontSize = 13.sp)
        Text(text = formatPriceUsd(price.priceUsd), color = Cream, fontSize = 13.sp)
    }
}
