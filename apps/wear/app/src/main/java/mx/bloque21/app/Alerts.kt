package mx.bloque21.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit
import kotlin.math.abs

/** Después de avisar, la misma alerta espera al menos 30 min (igual que en el teléfono). */
const val ALERT_COOLDOWN_MS = 30 * 60_000L

private const val CHANNEL = "alertas"
private const val WORK = "bloque21-alertas"

/** Resultado de revisar una alerta: la alerta actualizada y, si toca, el aviso. */
data class AlertCheck(val alert: WatchAlert, val fired: Boolean)

/**
 * Misma regla que evaluateAlerts en packages/shared, para la variación de 24 h:
 * dispara al cruzar el umbral, se desarma hasta que la condición deja de cumplirse,
 * respeta el enfriamiento y nunca usa un precio viejo.
 */
fun checkAlert(alert: WatchAlert, quote: Quote?, now: Long): AlertCheck {
    if (quote == null || quote.isStale(now)) return AlertCheck(alert, false)
    val holds = abs(quote.change24hPct) >= alert.thresholdPct
    if (!holds) return AlertCheck(if (alert.armed) alert else alert.copy(armed = true), false)
    val cooling = alert.lastFiredAt > 0 && now - alert.lastFiredAt < ALERT_COOLDOWN_MS
    if (!alert.armed || cooling) return AlertCheck(alert.copy(armed = false), false)
    return AlertCheck(alert.copy(armed = false, lastFiredAt = now), true)
}

/** Revisa las alertas del reloj cada 15 min (el mínimo de Android), aunque la app esté cerrada. */
class AlertWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val alerts = Settings.alerts(applicationContext)
        val snapshot = try {
            Market.refresh(applicationContext)
        } catch (error: Exception) {
            return Result.retry()
        }
        // Con precios nuevos, el tile y la carátula se actualizan en el mismo ciclo.
        refreshSurfaces(applicationContext)
        val now = System.currentTimeMillis()
        for (alert in alerts) {
            val quote = snapshot.quote(alert.coinId)
            val check = checkAlert(alert, quote, now)
            Settings.saveAlert(applicationContext, check.alert)
            if (check.fired && quote != null) notifyMove(applicationContext, coinById(alert.coinId), quote, alert.thresholdPct)
        }
        return Result.success()
    }

    companion object {
        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<AlertWorker>(15, TimeUnit.MINUTES)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.KEEP, request)
        }
    }
}

fun ensureChannel(context: Context) {
    val manager = context.getSystemService(NotificationManager::class.java)
    if (manager.getNotificationChannel(CHANNEL) != null) return
    val channel = NotificationChannel(CHANNEL, "Alertas de precio", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Avisos cuando una moneda se mueve más de lo que elegiste"
        enableVibration(true)
        // Dos pulsos cortos: distinto de una llamada o un mensaje.
        vibrationPattern = longArrayOf(0, 180, 120, 180)
    }
    manager.createNotificationChannel(channel)
}

fun canNotify(context: Context) =
    context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

fun notifyMove(context: Context, coin: Coin, quote: Quote, thresholdPct: Int) {
    if (!canNotify(context)) return
    ensureChannel(context)
    val currency = Settings.currency(context)
    val snapshot = Market.cached(context)
    val price = formatMoney(quote.priceUsd, currency, snapshot?.usdMxn)
    val direction = if (quote.change24hPct >= 0) "subió" else "bajó"
    val open = PendingIntent.getActivity(
        context,
        coin.id.hashCode(),
        Intent(context, MainActivity::class.java).putExtra(MainActivity.EXTRA_COIN, coin.id),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
    val notification = NotificationCompat.Builder(context, CHANNEL)
        .setSmallIcon(R.drawable.ic_launcher)
        .setContentTitle("${coin.symbol} ${formatSignedPercent(quote.change24hPct)}")
        .setContentText("$direction más de $thresholdPct% en 24 h. Ahora: $price")
        .setContentIntent(open)
        .setAutoCancel(true)
        .setCategory(NotificationCompat.CATEGORY_REMINDER)
        .build()
    NotificationManagerCompat.from(context).notify(coin.id.hashCode(), notification)
}
