package mx.bloque21.app

import android.Manifest
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import androidx.wear.compose.foundation.lazy.TransformingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberTransformingLazyColumnState
import androidx.wear.compose.material3.AppScaffold
import androidx.wear.compose.material3.Button
import androidx.wear.compose.material3.ButtonDefaults
import androidx.wear.compose.material3.Card
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.ScreenScaffold
import androidx.wear.compose.material3.SwitchButton
import androidx.wear.compose.material3.Text
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import kotlinx.coroutines.delay

private val Cream = Color(0xFFF6F0E6)
private val Sand = Color(0xFFBDB3A2)
private val Dust = Color(0xFFA89E8D)
private val Up = Color(0xFF4FD8A5)
private val Down = Color(0xFFFF7A6B)
private val Btc = Color(0xFFF7931A)

/** Mientras la app está abierta y activa se refresca cada 30 s; en segundo plano no consulta. */
private const val REFRESH_MS = 30_000L

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ensureChannel(this)
        AlertWorker.schedule(this)
        val startCoin = intent.getStringExtra(EXTRA_COIN)
        setContent {
            MaterialTheme {
                AppScaffold {
                    BloqueApp(startCoin)
                }
            }
        }
    }

    companion object {
        const val EXTRA_COIN = "coin"
    }
}

/** Estado de mercado compartido por todas las pantallas del reloj. */
private class MarketState {
    var snapshot by mutableStateOf<Snapshot?>(null)
    var offline by mutableStateOf(false)
    /** Cambia cuando el usuario toca un ajuste, para volver a leer las preferencias. */
    var settingsVersion by mutableIntStateOf(0)
}

@Composable
private fun BloqueApp(startCoin: String?) {
    val context = LocalContext.current
    val market = remember { MarketState().apply { snapshot = Market.cached(context) } }
    val lifecycle = LocalLifecycleOwner.current.lifecycle

    LaunchedEffect(lifecycle) {
        lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            while (true) {
                val (snapshot, offline) = Market.refreshOrCached(context)
                market.snapshot = snapshot
                market.offline = offline
                if (!offline) refreshSurfaces(context)
                delay(REFRESH_MS)
            }
        }
    }

    val nav = rememberSwipeDismissableNavController()
    SwipeDismissableNavHost(navController = nav, startDestination = if (startCoin != null) "coin/$startCoin" else "list") {
        composable("list") {
            ListScreen(market, onCoin = { nav.navigate("coin/$it") }, onAlerts = { nav.navigate("alerts") })
        }
        composable("coin/{id}") { entry ->
            DetailScreen(market, coinById(entry.arguments?.getString("id") ?: COINS.first().id))
        }
        composable("alerts") {
            AlertsScreen(market, onCoin = { nav.navigate("coin/$it") })
        }
    }
}

@Composable
private fun ListScreen(market: MarketState, onCoin: (String) -> Unit, onAlerts: () -> Unit) {
    val context = LocalContext.current
    val state = rememberTransformingLazyColumnState()
    @Suppress("UNUSED_VARIABLE") val version = market.settingsVersion
    val primary = Settings.primaryCoin(context)
    val currency = Settings.currency(context)
    val snapshot = market.snapshot

    ScreenScaffold(scrollState = state) { padding ->
        TransformingLazyColumn(state = state, contentPadding = padding) {
            item {
                PrimaryCard(primary, snapshot, currency, market.offline) { onCoin(primary.id) }
            }
            if (snapshot == null) {
                item { Message(if (market.offline) "Sin red. Reintento en 30 s." else "Leyendo precios…") }
            }
            COINS.filter { it.id != primary.id }.forEach { coin ->
                item {
                    CoinButton(coin, snapshot, currency) { onCoin(coin.id) }
                }
            }
            item {
                Button(
                    onClick = {
                        Settings.setCurrency(context, if (currency == Currency.MXN) Currency.USD else Currency.MXN)
                        market.settingsVersion++
                        refreshSurfaces(context)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.filledTonalButtonColors(),
                    secondaryLabel = { Text("Toca para cambiar") },
                    label = { Text(if (currency == Currency.MXN) "Precios en pesos" else "Precios en dólares") },
                )
            }
            item {
                val active = Settings.alerts(context).size
                Button(
                    onClick = onAlerts,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.filledTonalButtonColors(),
                    secondaryLabel = { Text(if (active == 0) "Ninguna activa" else "$active activas") },
                    label = { Text("Alertas") },
                )
            }
        }
    }
}

@Composable
private fun PrimaryCard(coin: Coin, snapshot: Snapshot?, currency: Currency, offline: Boolean, onClick: () -> Unit) {
    val quote = snapshot?.quote(coin.id)
    Card(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
            Text(coin.name, color = Sand, fontSize = 13.sp)
            if (quote == null || snapshot == null) {
                Text("--", color = Cream, fontSize = 26.sp, fontWeight = FontWeight.SemiBold)
            } else {
                Text(
                    formatMoney(quote.priceUsd, currency, snapshot.usdMxn),
                    color = Cream,
                    fontSize = 26.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                )
                Change(quote.change24hPct, 14)
                val stale = quote.isStale() || offline
                Text(
                    if (offline) "Sin red. ${freshness(quote.asOf, true)}" else freshness(quote.asOf, stale),
                    color = if (stale) Down else Dust,
                    fontSize = 11.sp,
                )
            }
        }
    }
}

@Composable
private fun CoinButton(coin: Coin, snapshot: Snapshot?, currency: Currency, onClick: () -> Unit) {
    val quote = snapshot?.quote(coin.id)
    Button(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.filledTonalButtonColors(),
        secondaryLabel = {
            if (quote != null && snapshot != null) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(formatMoney(quote.priceUsd, currency, snapshot.usdMxn), color = Cream)
                    Change(quote.change24hPct, 12)
                }
            }
        },
        label = { Text(coin.symbol, color = coin.tint, fontWeight = FontWeight.SemiBold) },
    )
}

@Composable
private fun DetailScreen(market: MarketState, coin: Coin) {
    val context = LocalContext.current
    val state = rememberTransformingLazyColumnState()
    @Suppress("UNUSED_VARIABLE") val version = market.settingsVersion
    val currency = Settings.currency(context)
    val snapshot = market.snapshot
    val quote = snapshot?.quote(coin.id)
    var closes by remember(coin.id) { mutableStateOf<List<Double>?>(null) }
    var chartFailed by remember(coin.id) { mutableStateOf(false) }
    var alert by remember(coin.id) { mutableStateOf(Settings.alert(context, coin.id)) }
    var pendingThreshold by remember { mutableStateOf<Int?>(null) }

    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        val threshold = pendingThreshold ?: return@rememberLauncherForActivityResult
        pendingThreshold = null
        if (granted) {
            val created = WatchAlert(coin.id, threshold, armed = quote?.let { kotlin.math.abs(it.change24hPct) < threshold } ?: true, lastFiredAt = 0)
            Settings.saveAlert(context, created)
            alert = created
            market.settingsVersion++
        }
    }

    LaunchedEffect(coin.id) {
        closes = try {
            Binance.dayCloses(coin.binanceSymbol)
        } catch (error: Exception) {
            chartFailed = true
            null
        }
    }

    ScreenScaffold(scrollState = state) { padding ->
        TransformingLazyColumn(state = state, contentPadding = padding) {
            item {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    Text(coin.name, color = coin.tint, fontSize = 14.sp)
                    if (quote != null && snapshot != null) {
                        Text(
                            formatMoney(quote.priceUsd, currency, snapshot.usdMxn),
                            color = Cream,
                            fontSize = 26.sp,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                        )
                        Change(quote.change24hPct, 14)
                    } else {
                        Text("Sin precio todavía", color = Sand, fontSize = 14.sp)
                    }
                }
            }
            item {
                val data = closes
                when {
                    data != null && data.size >= 2 -> Sparkline(data, coin.tint)
                    chartFailed -> Message("La gráfica no cargó; revisa la conexión.")
                    else -> Message("Cargando 24 h…")
                }
            }
            if (quote != null && snapshot != null) {
                item {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                        Text("Rango de 24 h", color = Dust, fontSize = 11.sp)
                        Text(
                            "${formatMoney(quote.lowUsd, currency, snapshot.usdMxn)} a ${formatMoney(quote.highUsd, currency, snapshot.usdMxn)}",
                            color = Sand,
                            fontSize = 13.sp,
                            textAlign = TextAlign.Center,
                        )
                        Text(freshness(quote.asOf, quote.isStale()), color = Dust, fontSize = 11.sp)
                    }
                }
            }
            item {
                val isPrimary = Settings.primaryCoin(context).id == coin.id
                SwitchButton(
                    checked = isPrimary,
                    onCheckedChange = { checked ->
                        if (checked) {
                            Settings.setPrimaryCoin(context, coin.id)
                            market.settingsVersion++
                            refreshSurfaces(context)
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    secondaryLabel = { Text("En el tile y la carátula") },
                    label = { Text("Principal") },
                )
            }
            item {
                val current = alert
                Button(
                    onClick = {
                        // Cada toque pasa al siguiente porcentaje; después del último se apaga.
                        val index = current?.let { ALERT_STEPS.indexOf(it.thresholdPct) } ?: -1
                        val next = ALERT_STEPS.getOrNull(index + 1)
                        if (next == null) {
                            Settings.removeAlert(context, coin.id)
                            alert = null
                            market.settingsVersion++
                        } else if (!canNotify(context)) {
                            pendingThreshold = next
                            permission.launch(Manifest.permission.POST_NOTIFICATIONS)
                        } else {
                            val updated = WatchAlert(
                                coin.id,
                                next,
                                armed = quote?.let { kotlin.math.abs(it.change24hPct) < next } ?: true,
                                lastFiredAt = current?.lastFiredAt ?: 0,
                            )
                            Settings.saveAlert(context, updated)
                            alert = updated
                            market.settingsVersion++
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.filledTonalButtonColors(),
                    secondaryLabel = {
                        Text(if (current == null) "Toca para activar" else "Si se mueve más de ${current.thresholdPct}% en 24 h")
                    },
                    label = { Text(if (current == null) "Alerta apagada" else "Alerta: ±${current.thresholdPct}%") },
                )
            }
        }
    }
}

@Composable
private fun AlertsScreen(market: MarketState, onCoin: (String) -> Unit) {
    val context = LocalContext.current
    val state = rememberTransformingLazyColumnState()
    @Suppress("UNUSED_VARIABLE") val version = market.settingsVersion
    val alerts = Settings.alerts(context)
    val snapshot = market.snapshot

    ScreenScaffold(scrollState = state) { padding ->
        TransformingLazyColumn(state = state, contentPadding = padding) {
            item { Text("Alertas del reloj", color = Cream, fontSize = 16.sp, fontWeight = FontWeight.SemiBold) }
            if (alerts.isEmpty()) {
                item { Message("Abre una moneda y toca \"Alerta apagada\" para crear una.") }
            }
            alerts.forEach { alert ->
                val coin = coinById(alert.coinId)
                val quote = snapshot?.quote(coin.id)
                item {
                    Button(
                        onClick = { onCoin(coin.id) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.filledTonalButtonColors(),
                        secondaryLabel = {
                            Text(quote?.let { "Hoy ${formatSignedPercent(it.change24hPct)}" } ?: "Sin precio")
                        },
                        label = { Text("${coin.symbol} ±${alert.thresholdPct}%", color = coin.tint) },
                    )
                }
            }
            item { Message("Se revisan cada 15 min, aunque la app esté cerrada. Vibran dos veces.") }
        }
    }
}

@Composable
private fun Change(value: Double, size: Int) {
    Text(
        formatSignedPercent(value),
        color = if (value >= 0) Up else Down,
        fontSize = size.sp,
        modifier = Modifier.semantics { contentDescription = "${formatSignedPercent(value)} en 24 horas" },
    )
}

@Composable
private fun Message(text: String) {
    Text(
        text,
        color = Sand,
        fontSize = 13.sp,
        textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
    )
}

/** Línea simple de las últimas 24 h; sin ejes, para leerse de un vistazo en pantalla redonda. */
@Composable
private fun Sparkline(closes: List<Double>, tint: Color) {
    val low = closes.min()
    val high = closes.max()
    val change = (closes.last() / closes.first() - 1) * 100
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Canvas(
            modifier = Modifier
                .fillMaxWidth(0.85f)
                .height(52.dp)
                .semantics { contentDescription = "Gráfica de 24 horas: ${formatSignedPercent(change)}" },
        ) {
            val span = (high - low).takeIf { it > 0 } ?: 1.0
            val stepX = size.width / (closes.size - 1)
            val path = Path()
            closes.forEachIndexed { index, close ->
                val point = Offset(index * stepX, (size.height * (1 - (close - low) / span)).toFloat())
                if (index == 0) path.moveTo(point.x, point.y) else path.lineTo(point.x, point.y)
            }
            drawPath(path, tint, style = Stroke(width = 2.5.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
            drawCircle(Btc.takeIf { tint == Btc } ?: tint, radius = 3.dp.toPx(), center = Offset(size.width, (size.height * (1 - (closes.last() - low) / span)).toFloat()))
        }
        Text("Últimas 24 h", color = Dust, fontSize = 10.sp)
    }
}
