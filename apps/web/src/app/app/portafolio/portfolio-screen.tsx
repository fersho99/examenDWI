"use client";

import {
  INITIAL_COINS,
  TransactionSchema,
  buildPositions,
  formatMoney,
  formatQuantity,
  formatSignedMoney,
  formatSignedPercent,
  sumPortfolio,
  valuePositions,
  type Transaction,
} from "@bloque21/shared";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { newId, useLocalState } from "@/lib/local-store";
import { CurrencySwitch, useMarket } from "../market-context";
import { CoinSelect, FIELD, PRIMARY_BUTTON, QUIET_BUTTON, ScreenTitle, Segmented, parseAmount, tone } from "../ui";

const TransactionsSchema = z.array(TransactionSchema);
const EMPTY: Transaction[] = [];

const dateTime = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Mexico_City",
});

const coinOf = (coinId: string) => INITIAL_COINS.find((coin) => coin.id === coinId);

/** Fecha y hora local en el formato que espera <input type="datetime-local">. */
function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function PortfolioScreen() {
  const market = useMarket();
  const [transactions, setTransactions] = useLocalState("bloque21.portfolio", TransactionsSchema, EMPTY);
  const [formOpen, setFormOpen] = useState(false);
  const [removed, setRemoved] = useState<Transaction | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const summary = useMemo(() => {
    const pricesUsd = new Map(market.prices.map((price) => [price.coinId, price.priceUsd]));
    let built: ReturnType<typeof buildPositions> = [];
    try {
      built = buildPositions(transactions);
    } catch {
      // Datos inconsistentes guardados a mano: se muestran solo los movimientos.
    }
    const positions = valuePositions(built, pricesUsd, market.usdMxn);
    return { positions: positions.filter((position) => position.quantity > 0), total: sumPortfolio(positions) };
  }, [transactions, market.prices, market.usdMxn]);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  /** En MXN se usan los montos calculados con el tipo de cambio de cada compra. */
  const show = (usd: number | null, mxn: number | null, signed = false) => {
    const useMxn = market.currency === "MXN" && mxn !== null && market.usdMxn !== null;
    const amount = useMxn ? mxn : usd;
    if (amount === null) return "Sin precio";
    const currency = useMxn ? "MXN" : "USD";
    return signed ? formatSignedMoney(amount, currency) : formatMoney(amount, currency, 2);
  };

  function remove(transaction: Transaction) {
    const next = transactions.filter((item) => item.id !== transaction.id);
    try {
      buildPositions(next);
    } catch {
      setRemoved(null);
      alert("No se puede borrar esa compra: dejaría una venta posterior sin unidades. Borra primero la venta.");
      return;
    }
    setTransactions(next);
    setRemoved(transaction);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setRemoved(null), 6000);
  }

  const { total, positions } = summary;
  const ordered = [...transactions].sort((a, b) => b.executedAt.localeCompare(a.executedAt));

  return (
    <div className="space-y-10">
      <ScreenTitle aside={<CurrencySwitch />}>Portafolio</ScreenTitle>

      {transactions.length === 0 && !formOpen ? (
        <section className="rise space-y-4">
          <p className="text-lg text-sand">
            Registra tu primera compra y aquí verás cuánto vale hoy, tu costo promedio y cuánto vas ganando o
            perdiendo, en pesos y en dólares.
          </p>
          <button type="button" onClick={() => setFormOpen(true)} className={PRIMARY_BUTTON}>
            Registrar una compra
          </button>
        </section>
      ) : (
        <section aria-labelledby="total-title" className="rise">
          <h2 id="total-title" className="text-sand">
            Vale hoy
          </h2>
          <p className="mt-1 font-display text-5xl font-semibold tracking-tight tabular-nums">
            {show(total.valueUsd, total.valueMxn)}
          </p>
          <p className={`mt-2 tabular-nums ${tone(total.unrealizedUsd)}`}>
            {show(total.unrealizedUsd, total.unrealizedMxn, true)}
            {total.unrealizedPct !== null && ` (${formatSignedPercent(total.unrealizedPct)})`}
            <span className="text-sand"> sin vender</span>
          </p>
          {(total.realizedUsd !== 0 || total.realizedMxn !== 0) && (
            <p className={`mt-1 text-sm tabular-nums ${tone(total.realizedUsd)}`}>
              {show(total.realizedUsd, total.realizedMxn, true)}
              <span className="text-sand"> ya cobrados en ventas</span>
            </p>
          )}
          <p className="mt-1 text-sm text-dust">
            Invertido: {show(total.costUsd, total.costMxn)}
            {!total.complete && ". Falta el precio de alguna moneda; el total puede estar incompleto"}.
          </p>
        </section>
      )}

      {positions.length > 0 && (
        <section aria-labelledby="positions-title">
          <h2 id="positions-title" className="font-display text-xl font-semibold">
            Tus monedas
          </h2>
          <ul className="mt-3 space-y-4">
            {positions.map((position) => {
              const coin = coinOf(position.coinId);
              return (
                <li key={position.coinId} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {coin?.symbol ?? position.coinId}{" "}
                      <span className="text-sm text-dust">{formatQuantity(position.quantity)}</span>
                    </p>
                    <p className="text-sm text-dust">
                      Costo promedio {show(position.avgCostUsd, position.avgCostMxn)}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p>{show(position.valueUsd, position.valueMxn)}</p>
                    <p className={`text-sm ${tone(position.unrealizedUsd)}`}>
                      {show(position.unrealizedUsd, position.unrealizedMxn, true)}
                      {position.unrealizedPct !== null && ` (${formatSignedPercent(position.unrealizedPct)})`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {formOpen ? (
        <TransactionForm
          transactions={transactions}
          onCancel={() => setFormOpen(false)}
          onSave={(transaction) => {
            setTransactions([...transactions, transaction]);
            setFormOpen(false);
          }}
        />
      ) : (
        transactions.length > 0 && (
          <button type="button" onClick={() => setFormOpen(true)} className={`${PRIMARY_BUTTON} w-full`}>
            Registrar compra o venta
          </button>
        )
      )}

      {removed && (
        <div role="status" className="flex items-center justify-between gap-4 rounded-2xl bg-ink-3 px-4 py-2 text-sm">
          <span>Movimiento borrado.</span>
          <button
            type="button"
            className="min-h-11 font-medium text-btc"
            onClick={() => {
              setTransactions([...transactions, removed]);
              setRemoved(null);
            }}
          >
            Deshacer
          </button>
        </div>
      )}

      {ordered.length > 0 && (
        <section aria-labelledby="history-title">
          <h2 id="history-title" className="font-display text-xl font-semibold">
            Movimientos
          </h2>
          <ul className="mt-3 space-y-3">
            {ordered.map((transaction) => {
              const coin = coinOf(transaction.coinId);
              const totalUsd = transaction.quantity * transaction.priceUsd;
              return (
                <li key={transaction.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p>
                      <span className={transaction.side === "buy" ? "text-up" : "text-down"}>
                        {transaction.side === "buy" ? "Compra" : "Venta"}
                      </span>{" "}
                      {formatQuantity(transaction.quantity)} {coin?.symbol}
                    </p>
                    <p className="text-sm text-dust">
                      {dateTime.format(new Date(transaction.executedAt))}, total{" "}
                      {show(totalUsd, totalUsd * transaction.fxMxn)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(transaction)}
                    aria-label={`Borrar ${transaction.side === "buy" ? "compra" : "venta"} de ${coin?.name}`}
                    className={QUIET_BUTTON}
                  >
                    Borrar
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm text-dust">
            Los movimientos se guardan en este teléfono. El valor en pesos del costo usa el tipo de cambio del día
            en que registraste cada movimiento.
          </p>
        </section>
      )}
    </div>
  );
}

function TransactionForm({
  transactions,
  onSave,
  onCancel,
}: {
  transactions: Transaction[];
  onSave: (transaction: Transaction) => void;
  onCancel: () => void;
}) {
  const market = useMarket();
  const [coinId, setCoinId] = useState<string>(INITIAL_COINS[0].id);
  const [side, setSide] = useState<Transaction["side"]>("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [when, setWhen] = useState(() => localInputValue(new Date()));
  const [error, setError] = useState<string | null>(null);

  const current = market.pricesById.get(coinId);
  const currentDisplay = current ? market.toDisplay(current.priceUsd) : null;

  function applyCurrentPrice() {
    if (currentDisplay) setPrice(String(Number(currentDisplay.amount.toPrecision(8))));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const qty = parseAmount(quantity);
    const unit = parseAmount(price);
    const executedAt = new Date(when);
    if (qty === null) return setError("Escribe una cantidad mayor a cero, por ejemplo 0.05.");
    if (unit === null) return setError("Escribe el precio por unidad, o usa el precio actual.");
    if (Number.isNaN(executedAt.getTime()) || executedAt.getTime() > Date.now() + 60_000) {
      return setError("La fecha no puede ser futura.");
    }
    const priceUsd = market.fromDisplay(unit);
    if (priceUsd === null || market.usdMxn === null) {
      return setError("Aún no tenemos el tipo de cambio. Espera unos segundos o cambia a USD.");
    }

    const transaction: Transaction = {
      id: newId(),
      coinId,
      side,
      quantity: qty,
      priceUsd,
      fxMxn: market.usdMxn,
      executedAt: executedAt.toISOString(),
    };
    try {
      buildPositions([...transactions, transaction]);
    } catch {
      return setError("No puedes vender más de lo que tienes registrado de esa moneda en esa fecha.");
    }
    onSave(transaction);
  }

  return (
    <form onSubmit={submit} className="rise space-y-5" noValidate aria-labelledby="form-title">
      <h2 id="form-title" className="font-display text-xl font-semibold">
        Nuevo movimiento
      </h2>
      <Segmented
        label="Tipo de movimiento"
        value={side}
        onChange={setSide}
        options={[
          { value: "buy", label: "Compra" },
          { value: "sell", label: "Venta" },
        ]}
      />
      <CoinSelect value={coinId} onChange={(id) => { setCoinId(id); setPrice(""); }} />
      <label className="block text-sm font-medium">
        Cantidad de {coinOf(coinId)?.symbol}
        <input
          inputMode="decimal"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="0.05"
          className={FIELD}
        />
      </label>
      <label className="block text-sm font-medium">
        Precio por unidad en {market.currency === "MXN" && market.usdMxn !== null ? "pesos" : "dólares"}
        <input
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder={currentDisplay ? formatMoney(currentDisplay.amount, currentDisplay.currency) : ""}
          className={FIELD}
        />
      </label>
      {currentDisplay && (
        <button type="button" onClick={applyCurrentPrice} className="-mt-3 min-h-11 text-sm text-btc">
          Usar el precio actual: {formatMoney(currentDisplay.amount, currentDisplay.currency)}
        </button>
      )}
      <label className="block text-sm font-medium">
        Fecha y hora
        <input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} className={FIELD} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-down">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button type="submit" className={`${PRIMARY_BUTTON} flex-1`}>
          Guardar
        </button>
        <button type="button" onClick={onCancel} className={QUIET_BUTTON}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
