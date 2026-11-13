"use client";

import { useEffect, useState } from "react";

const clock = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Mexico_City",
});

/**
 * Antigüedad real del dato. En el primer render (servidor y navegador) muestra la hora
 * absoluta para que coincidan; ya montado, el tiempo relativo, que se actualiza cada minuto.
 */
export function Freshness({ asOf, stale }: { asOf: string; stale: boolean }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    queueMicrotask(tick);
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);

  const at = clock.format(new Date(asOf));
  if (stale) {
    return <span className="text-down">Último precio de las {at}. La fuente no se ha actualizado desde entonces.</span>;
  }
  if (now === null) return <span className="text-dust">Actualizado a las {at}, con datos de Binance</span>;

  const minutes = Math.max(0, Math.round((now - new Date(asOf).getTime()) / 60_000));
  const when = minutes < 1 ? "hace un momento" : `hace ${minutes} min`;
  return <span className="text-dust">Actualizado {when}, con datos de Binance</span>;
}
