"use client";

import { evaluateAlerts, formatSignedPercent, type AlertEvent } from "@bloque21/shared";
import { useEffect, useRef, useState } from "react";
import { newId } from "@/lib/local-store";
import { notify } from "@/lib/notify";
import { MAX_EVENTS, coinName, useAlertEvents, useAlertRules } from "./alerts-store";
import { useMarket } from "./market-context";

/**
 * Revisa las alertas con cada precio nuevo (cada 30 s mientras la app está abierta) y avisa
 * con una notificación del sistema. Si no hay permiso, muestra el aviso dentro de la app.
 */
export function AlertWatcher() {
  const { prices, money } = useMarket();
  const [rules, setRules] = useAlertRules();
  const [, setEvents] = useAlertEvents();
  const [banner, setBanner] = useState<string | null>(null);
  const checked = useRef<Price[] | null>(null);

  useEffect(() => {
    if (prices.length === 0 || checked.current === prices || rules.length === 0) return;
    checked.current = prices;

    const quotes = new Map(prices.map((price) => [price.coinId, price]));
    const result = evaluateAlerts(rules, quotes, new Date(), newId);
    if (result.rules.some((rule, index) => rule !== rules[index])) setRules(result.rules);
    if (result.fired.length === 0) return;

    setEvents((current) => [...result.fired, ...current].slice(0, MAX_EVENTS));
    for (const event of result.fired) {
      const message = describe(event, money);
      void notify(`Bloque 21: ${coinName(event.coinId)}`, message).then((shown) => {
        if (!shown) setBanner(message);
      });
    }
  }, [prices, rules, setRules, setEvents, money]);

  if (!banner) return null;
  return (
    <div role="alert" className="fixed inset-x-4 top-4 z-40 mx-auto max-w-xl rounded-2xl bg-ink-3 px-4 py-3 shadow-lg shadow-black/40">
      <p className="text-sm">{banner}</p>
      <button type="button" onClick={() => setBanner(null)} className="mt-1 min-h-10 text-sm text-btc">
        Entendido
      </button>
    </div>
  );
}

type Price = ReturnType<typeof useMarket>["prices"][number];

export function describe(event: AlertEvent, money: (usd: number) => string) {
  const name = coinName(event.coinId);
  if (event.kind === "above") return `${name} subió a ${money(event.value)} (tu límite: ${money(event.threshold)}).`;
  if (event.kind === "below") return `${name} bajó a ${money(event.value)} (tu límite: ${money(event.threshold)}).`;
  return `${name} se movió ${formatSignedPercent(event.value)} en 24 h (tu límite: ${event.threshold}%).`;
}
