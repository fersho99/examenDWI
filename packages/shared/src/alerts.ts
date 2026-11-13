import { z } from "zod";

export const ALERT_KINDS = ["above", "below", "move24h"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export const AlertRuleSchema = z.object({
  id: z.string().min(1),
  coinId: z.string().min(1),
  kind: z.enum(ALERT_KINDS),
  /** above/below: precio en USD. move24h: porcentaje absoluto de variación en 24 h. */
  threshold: z.number().positive(),
  enabled: z.boolean(),
  /**
   * Armada: la condición estaba falsa en la última revisión, así que puede disparar.
   * Evita que un precio que se queda arriba del umbral avise en cada revisión.
   */
  armed: z.boolean(),
  lastFiredAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type AlertRule = z.infer<typeof AlertRuleSchema>;

export const AlertEventSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  coinId: z.string().min(1),
  kind: z.enum(ALERT_KINDS),
  threshold: z.number(),
  /** Precio en USD, o variación en %, cuando se cumplió. */
  value: z.number(),
  firedAt: z.iso.datetime({ offset: true }),
});
export type AlertEvent = z.infer<typeof AlertEventSchema>;

/** Tiempo mínimo entre dos avisos de la misma regla aunque se rearme. */
export const ALERT_COOLDOWN_MS = 30 * 60_000;

export interface AlertQuote {
  priceUsd: number;
  change24hPct: number | null;
  stale: boolean;
}

function conditionHolds(rule: AlertRule, quote: AlertQuote): { holds: boolean; value: number } | null {
  if (rule.kind === "above") return { holds: quote.priceUsd > rule.threshold, value: quote.priceUsd };
  if (rule.kind === "below") return { holds: quote.priceUsd < rule.threshold, value: quote.priceUsd };
  if (quote.change24hPct === null) return null;
  return { holds: Math.abs(quote.change24hPct) >= rule.threshold, value: quote.change24hPct };
}

/**
 * Revisa las reglas contra los precios. Devuelve las reglas actualizadas y los avisos nuevos.
 * Un precio viejo nunca dispara: no se avisa con datos que no son actuales.
 */
export function evaluateAlerts(
  rules: AlertRule[],
  quotes: ReadonlyMap<string, AlertQuote>,
  now: Date,
  makeId: () => string,
): { rules: AlertRule[]; fired: AlertEvent[] } {
  const fired: AlertEvent[] = [];

  const next = rules.map((rule) => {
    const quote = quotes.get(rule.coinId);
    if (!rule.enabled || !quote || quote.stale) return rule;
    const check = conditionHolds(rule, quote);
    if (!check) return rule;

    if (!check.holds) return rule.armed ? rule : { ...rule, armed: true };

    const cooling =
      rule.lastFiredAt !== null && now.getTime() - new Date(rule.lastFiredAt).getTime() < ALERT_COOLDOWN_MS;
    if (!rule.armed || cooling) return rule.armed ? { ...rule, armed: false } : rule;

    const firedAt = now.toISOString();
    fired.push({
      id: makeId(),
      ruleId: rule.id,
      coinId: rule.coinId,
      kind: rule.kind,
      threshold: rule.threshold,
      value: check.value,
      firedAt,
    });
    return { ...rule, armed: false, lastFiredAt: firedAt };
  });

  return { rules: next, fired };
}

/**
 * Al crear una regla queda armada solo si hoy no se cumple, para que no avise de inmediato
 * por algo que ya era cierto.
 */
export function initialArmed(kind: AlertKind, threshold: number, quote: AlertQuote | undefined) {
  if (!quote) return true;
  const probe: AlertRule = {
    id: "probe",
    coinId: "probe",
    kind,
    threshold,
    enabled: true,
    armed: true,
    lastFiredAt: null,
    createdAt: new Date(0).toISOString(),
  };
  const check = conditionHolds(probe, quote);
  return check ? !check.holds : true;
}
