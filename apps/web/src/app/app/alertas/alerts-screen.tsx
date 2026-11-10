"use client";

import { INITIAL_COINS, initialArmed, type AlertKind, type AlertRule } from "@bloque21/shared";
import { useEffect, useState, type FormEvent } from "react";
import { newId } from "@/lib/local-store";
import { getNotifyPermission, notify, requestNotifyPermission, type NotifyPermission } from "@/lib/notify";
import { describe } from "../alert-watcher";
import { coinName, useAlertEvents, useAlertRules } from "../alerts-store";
import { CurrencySwitch, useMarket } from "../market-context";
import { CoinSelect, FIELD, PRIMARY_BUTTON, QUIET_BUTTON, ScreenTitle, Segmented, parseAmount } from "../ui";

const KIND_OPTIONS = [
  { value: "below", label: "Baja de" },
  { value: "above", label: "Sube de" },
  { value: "move24h", label: "Se mueve" },
] as const satisfies readonly { value: AlertKind; label: string }[];

const timeFormat = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Mexico_City",
});

export function AlertsScreen() {
  const market = useMarket();
  const [rules, setRules] = useAlertRules();
  const [events, setEvents] = useAlertEvents();
  const [permission, setPermission] = useState<NotifyPermission | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    void getNotifyPermission().then(setPermission);
  }, []);

  const sentence = (rule: AlertRule) => {
    const name = coinName(rule.coinId);
    if (rule.kind === "move24h") return `${name} se mueve más de ${rule.threshold}% en 24 h`;
    return `${name} ${rule.kind === "above" ? "sube de" : "baja de"} ${market.money(rule.threshold)}`;
  };

  return (
    <div className="space-y-10">
      <ScreenTitle aside={<CurrencySwitch />}>Alertas</ScreenTitle>

      <section aria-labelledby="notify-title" className="rise space-y-3">
        <h2 id="notify-title" className="sr-only">
          Notificaciones
        </h2>
        {permission === "granted" ? (
          <p className="text-sand">
            Las notificaciones están activas. Tu Galaxy Watch las recibe del teléfono y vibra.
          </p>
        ) : permission === "denied" ? (
          <p className="text-down">
            Las notificaciones están bloqueadas. Actívalas en Ajustes &gt; Aplicaciones &gt; Bloque 21 &gt;
            Notificaciones; mientras tanto verás los avisos dentro de la app.
          </p>
        ) : permission === "unsupported" ? (
          <p className="text-sand">Este navegador no muestra notificaciones; verás los avisos dentro de la app.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sand">Activa las notificaciones para recibir los avisos en el teléfono y en el reloj.</p>
            <button
              type="button"
              className={PRIMARY_BUTTON}
              onClick={async () => setPermission(await requestNotifyPermission())}
            >
              Activar notificaciones
            </button>
          </div>
        )}
        {permission === "granted" && (
          <button
            type="button"
            className="min-h-11 text-sm text-btc"
            onClick={async () => {
              const shown = await notify("Bloque 21", "Así se verán tus alertas en el teléfono y en el reloj.");
              setTestResult(shown ? "Notificación de prueba enviada." : "No se pudo mostrar la notificación.");
            }}
          >
            Enviar notificación de prueba
          </button>
        )}
        {testResult && (
          <p role="status" className="text-sm text-dust">
            {testResult}
          </p>
        )}
      </section>

      <RuleForm onSave={(rule) => setRules([rule, ...rules])} />

      <section aria-labelledby="rules-title">
        <h2 id="rules-title" className="font-display text-xl font-semibold">
          Tus alertas
        </h2>
        {rules.length === 0 ? (
          <p className="mt-3 text-sand">Aún no tienes alertas. Crea la primera arriba.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {rules.map((rule) => (
              <li key={rule.id} className="flex min-h-14 items-center justify-between gap-3">
                <label className="flex min-w-0 flex-1 items-center gap-3">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={rule.enabled}
                    onChange={() =>
                      setRules(
                        rules.map((item) =>
                          item.id === rule.id ? { ...item, enabled: !item.enabled, armed: true } : item,
                        ),
                      )
                    }
                    className="size-6 shrink-0 accent-[var(--color-btc)]"
                  />
                  <span className={rule.enabled ? "" : "text-dust line-through"}>{sentence(rule)}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setRules(rules.filter((item) => item.id !== rule.id))}
                  aria-label={`Borrar alerta: ${sentence(rule)}`}
                  className={QUIET_BUTTON}
                >
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm text-dust">
          Se revisan cada 30 segundos mientras Bloque 21 está abierta, y nunca con un precio viejo. Después de
          avisar, cada alerta espera al menos 30 minutos antes de volver a sonar.
        </p>
      </section>

      {events.length > 0 && (
        <section aria-labelledby="events-title">
          <div className="flex items-center justify-between">
            <h2 id="events-title" className="font-display text-xl font-semibold">
              Avisos recientes
            </h2>
            <button type="button" onClick={() => setEvents([])} className={QUIET_BUTTON}>
              Limpiar
            </button>
          </div>
          <ul className="mt-3 space-y-3">
            {events.map((event) => (
              <li key={event.id}>
                <p>{describe(event, market.money)}</p>
                <p className="text-sm text-dust">{timeFormat.format(new Date(event.firedAt))}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function RuleForm({ onSave }: { onSave: (rule: AlertRule) => void }) {
  const market = useMarket();
  const [coinId, setCoinId] = useState<string>(INITIAL_COINS[0].id);
  const [kind, setKind] = useState<AlertKind>("below");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const quote = market.pricesById.get(coinId);
  const current = quote ? market.toDisplay(quote.priceUsd) : null;
  const amount = parseAmount(value);
  const distance =
    kind !== "move24h" && current && amount !== null ? (amount / current.amount - 1) * 100 : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (amount === null) return setError(kind === "move24h" ? "Escribe un porcentaje, por ejemplo 5." : "Escribe un precio.");
    if (kind === "move24h" && amount > 100) return setError("El porcentaje debe ser menor a 100.");
    const threshold = kind === "move24h" ? amount : market.fromDisplay(amount);
    if (threshold === null) return setError("Aún no tenemos el tipo de cambio. Espera unos segundos o cambia a USD.");

    onSave({
      id: newId(),
      coinId,
      kind,
      threshold,
      enabled: true,
      armed: initialArmed(kind, threshold, quote),
      lastFiredAt: null,
      createdAt: new Date().toISOString(),
    });
    setValue("");
    setError(null);
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate aria-labelledby="new-rule-title">
      <h2 id="new-rule-title" className="font-display text-xl font-semibold">
        Nueva alerta
      </h2>
      <CoinSelect value={coinId} onChange={setCoinId} label="Avísame si" />
      <Segmented label="Condición" value={kind} onChange={setKind} options={KIND_OPTIONS} />
      <label className="block text-sm font-medium">
        {kind === "move24h"
          ? "Más de este porcentaje en 24 h, hacia arriba o hacia abajo"
          : `Precio en ${current?.currency === "MXN" ? "pesos" : "dólares"}`}
        <input
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={kind === "move24h" ? "5" : current ? String(Math.round(current.amount * (kind === "below" ? 0.95 : 1.05))) : ""}
          className={FIELD}
        />
      </label>
      <p className="-mt-3 text-sm text-dust">
        {kind === "move24h"
          ? quote?.change24hPct !== null && quote?.change24hPct !== undefined
            ? `Hoy se ha movido ${Math.abs(quote.change24hPct).toFixed(2)}%.`
            : ""
          : current
            ? `Precio actual: ${market.money(quote!.priceUsd)}${distance !== null ? `. Tu límite está a ${distance >= 0 ? "+" : "−"}${Math.abs(distance).toFixed(1)}%.` : "."}`
            : "Esperando el precio actual…"}
      </p>
      {error && (
        <p role="alert" className="text-sm text-down">
          {error}
        </p>
      )}
      <button type="submit" className={`${PRIMARY_BUTTON} w-full`}>
        Crear alerta
      </button>
    </form>
  );
}
