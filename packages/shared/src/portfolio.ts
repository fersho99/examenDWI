import { z } from "zod";

export const TransactionSchema = z.object({
  id: z.string().min(1),
  coinId: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
  /** Precio por unidad en USD al momento del movimiento. */
  priceUsd: z.number().positive(),
  /** Pesos por dólar al registrar el movimiento: sin él, la ganancia en MXN sale mal. */
  fxMxn: z.number().positive(),
  executedAt: z.iso.datetime({ offset: true }),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export interface Position {
  coinId: string;
  quantity: number;
  /** Costo promedio por unidad de lo que aún tienes. */
  avgCostUsd: number;
  avgCostMxn: number;
  costUsd: number;
  costMxn: number;
  /** Ganancia ya cobrada en ventas. */
  realizedUsd: number;
  realizedMxn: number;
}

export interface ValuedPosition extends Position {
  priceUsd: number | null;
  valueUsd: number | null;
  valueMxn: number | null;
  unrealizedUsd: number | null;
  unrealizedMxn: number | null;
  unrealizedPct: number | null;
}

const EPSILON = 1e-12;

/**
 * Costo promedio: las compras suman al costo; las ventas sacan unidades al costo promedio
 * y lo que se cobra de más o de menos es ganancia realizada.
 * Lanza error si una venta deja la posición en negativo.
 */
export function buildPositions(transactions: Transaction[]): Position[] {
  const ordered = [...transactions].sort((a, b) => a.executedAt.localeCompare(b.executedAt));
  const positions = new Map<string, Position>();

  for (const tx of ordered) {
    const position = positions.get(tx.coinId) ?? {
      coinId: tx.coinId,
      quantity: 0,
      avgCostUsd: 0,
      avgCostMxn: 0,
      costUsd: 0,
      costMxn: 0,
      realizedUsd: 0,
      realizedMxn: 0,
    };

    if (tx.side === "buy") {
      position.quantity += tx.quantity;
      position.costUsd += tx.quantity * tx.priceUsd;
      position.costMxn += tx.quantity * tx.priceUsd * tx.fxMxn;
    } else {
      if (tx.quantity > position.quantity + EPSILON) {
        throw new Error(`Venta de ${tx.quantity} ${tx.coinId} sin unidades suficientes (${position.quantity}).`);
      }
      const share = tx.quantity / position.quantity;
      const costOutUsd = position.costUsd * share;
      const costOutMxn = position.costMxn * share;
      position.realizedUsd += tx.quantity * tx.priceUsd - costOutUsd;
      position.realizedMxn += tx.quantity * tx.priceUsd * tx.fxMxn - costOutMxn;
      position.quantity -= tx.quantity;
      position.costUsd -= costOutUsd;
      position.costMxn -= costOutMxn;
      if (position.quantity < EPSILON) {
        position.quantity = 0;
        position.costUsd = 0;
        position.costMxn = 0;
      }
    }

    position.avgCostUsd = position.quantity > 0 ? position.costUsd / position.quantity : 0;
    position.avgCostMxn = position.quantity > 0 ? position.costMxn / position.quantity : 0;
    positions.set(tx.coinId, position);
  }

  return [...positions.values()];
}

/** Valora cada posición al precio actual. El valor en MXN usa el tipo de cambio de hoy. */
export function valuePositions(
  positions: Position[],
  pricesUsd: ReadonlyMap<string, number>,
  fxMxn: number | null,
): ValuedPosition[] {
  return positions.map((position) => {
    const priceUsd = pricesUsd.get(position.coinId) ?? null;
    const valueUsd = priceUsd === null ? null : position.quantity * priceUsd;
    const valueMxn = valueUsd === null || fxMxn === null ? null : valueUsd * fxMxn;
    return {
      ...position,
      priceUsd,
      valueUsd,
      valueMxn,
      unrealizedUsd: valueUsd === null ? null : valueUsd - position.costUsd,
      unrealizedMxn: valueMxn === null ? null : valueMxn - position.costMxn,
      unrealizedPct:
        valueUsd === null || position.costUsd === 0 ? null : (valueUsd / position.costUsd - 1) * 100,
    };
  });
}

export function sumPortfolio(positions: ValuedPosition[]) {
  const open = positions.filter((position) => position.quantity > 0);
  const complete = open.every((position) => position.valueUsd !== null);
  const add = (pick: (position: ValuedPosition) => number | null) =>
    open.reduce((total, position) => total + (pick(position) ?? 0), 0);

  const costUsd = add((p) => p.costUsd);
  const valueUsd = add((p) => p.valueUsd);
  return {
    complete,
    costUsd,
    costMxn: add((p) => p.costMxn),
    valueUsd,
    valueMxn: add((p) => p.valueMxn),
    unrealizedUsd: valueUsd - costUsd,
    unrealizedMxn: add((p) => p.valueMxn) - add((p) => p.costMxn),
    unrealizedPct: costUsd > 0 ? (valueUsd / costUsd - 1) * 100 : null,
    realizedUsd: positions.reduce((total, p) => total + p.realizedUsd, 0),
    realizedMxn: positions.reduce((total, p) => total + p.realizedMxn, 0),
  };
}
