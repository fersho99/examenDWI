import Link from "next/link";
import { Suspense, type CSSProperties } from "react";
import { BlockChain } from "@/components/block-chain";
import { Footer } from "@/components/footer";
import { ArrowRightIcon } from "@/components/icons";
import { LiveTicker } from "@/components/live-ticker";
import { Logo } from "@/components/logo";
import { getMarket } from "@/lib/bitcoin";
import { formatNumber, formatPercent } from "@/lib/format";

const HALVINGS = [
  { year: "2009", reward: 50, note: "Bloque génesis" },
  { year: "2012", reward: 25, note: "Primer halving" },
  { year: "2016", reward: 12.5, note: "Segundo halving" },
  { year: "2020", reward: 6.25, note: "Tercer halving" },
  { year: "2024", reward: 3.125, note: "Recompensa actual" },
  { year: "~2028", reward: 1.5625, note: "Próximo, fecha estimada" },
];

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

export default function Home() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Link
          href="/login"
          className="press rounded-full border border-line px-4 py-2 text-sm font-medium text-cream hover:border-btc hover:text-btc"
        >
          Iniciar sesión
        </Link>
      </header>

      <main className="flex-1">
        <section className="relative overflow-x-clip">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-48 right-[-10%] h-[36rem] w-[36rem] rounded-full bg-btc/10 blur-3xl"
          />
          <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:pt-24 lg:pb-24">
            <div>
              <p className="rise font-mono text-xs tracking-[0.2em] text-btc uppercase">
                Bitcoin, sin ruido
              </p>
              <h1
                className="rise mt-5 font-display text-6xl leading-[0.95] font-semibold tracking-tight text-balance sm:text-7xl lg:text-8xl"
                style={delay(70)}
              >
                21 millones.
                <br />
                <span className="text-btc">Ni uno más.</span>
              </h1>
              <p
                className="rise mt-6 max-w-xl text-lg leading-relaxed text-sand"
                style={delay(140)}
              >
                Sigue el precio en vivo, revisa su historial y mide el ánimo del
                mercado desde un solo panel.
              </p>
              <div
                className="rise mt-8 flex flex-wrap items-center gap-3"
                style={delay(210)}
              >
                <Link
                  href="/login"
                  className="press nudge inline-flex items-center gap-2 rounded-full bg-btc px-6 py-3 font-semibold text-ink hover:bg-[#ffa63d]"
                >
                  Entrar al panel
                  <ArrowRightIcon className="nudge-icon size-4" />
                </Link>
                <a
                  href="#halving"
                  className="press rounded-full px-5 py-3 font-medium text-sand hover:text-cream"
                >
                  ¿Por qué es escaso?
                </a>
              </div>
            </div>

            <div
              className="rise border-t border-line pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8"
              style={delay(280)}
            >
              <Suspense fallback={<TickerSkeleton />}>
                <HeroTicker />
              </Suspense>
            </div>
          </div>
          <BlockChain />
        </section>

        <section
          id="halving"
          className="mx-auto grid w-full max-w-6xl scroll-mt-8 gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.5fr] lg:py-28"
        >
          <div className="reveal">
            <h2 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Cada cuatro años, la emisión se parte a la mitad.
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-sand">
              Los mineros reciben BTC nuevos por cada bloque que agregan a la
              cadena. Esa recompensa baja a la mitad cada 210,000 bloques: un
              evento llamado <em className="text-cream">halving</em>.
            </p>
          </div>

          <ol className="space-y-5" aria-label="Recompensa por bloque en BTC">
            {HALVINGS.map((item) => (
              <li
                key={item.year}
                className="reveal grid grid-cols-[3.75rem_1fr] items-center gap-3 sm:grid-cols-[4.5rem_1fr]"
              >
                <span className="font-mono text-sm text-dust">{item.year}</span>
                <div>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-cream">
                      {item.reward} BTC
                    </span>
                    <span className="text-right text-dust">{item.note}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-panel">
                    <div
                      className="grow-x h-full rounded-full bg-btc-deep"
                      style={{ width: `${(item.reward / 50) * 100}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-line bg-panel/50">
          <div className="reveal mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <Suspense fallback={<div className="skeleton h-40" />}>
              <SupplySection />
            </Suspense>
          </div>
        </section>

        <section className="reveal mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-6 lg:py-28">
          <h2 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Mira el mercado completo.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sand">
            Gráfica histórica, métricas clave y conversor a pesos, dólares y
            euros.
          </p>
          <Link
            href="/login"
            className="press nudge mt-8 inline-flex items-center gap-2 rounded-full bg-btc px-6 py-3 font-semibold text-ink hover:bg-[#ffa63d]"
          >
            Entrar al panel
            <ArrowRightIcon className="nudge-icon size-4" />
          </Link>
        </section>
      </main>

      <Footer />
    </>
  );
}

async function HeroTicker() {
  const market = await getMarket();
  return <LiveTicker initial={market} />;
}

function TickerSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="skeleton h-4 w-32" />
      <div className="skeleton h-12 w-56" />
      <div className="skeleton h-4 w-40" />
    </div>
  );
}

async function SupplySection() {
  const market = await getMarket();

  const details = market?.details;

  if (!details) {
    return (
      <p className="text-sand">
        El suministro no está disponible por ahora. Inténtalo en unos minutos.
      </p>
    );
  }

  const share = details.circulatingSupply / details.maxSupply;
  const remaining = details.maxSupply - details.circulatingSupply;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:items-end">
      <div>
        <p className="font-mono text-xs tracking-[0.2em] text-dust uppercase">
          Ya minado
        </p>
        <p className="mt-3 text-6xl font-semibold tracking-tight sm:text-7xl">
          {formatPercent(share * 100, 1)}
        </p>
      </div>
      <div>
        <div className="h-3 rounded-full bg-line">
          <div
            className="grow-x h-full rounded-full bg-btc-deep"
            style={{ width: `${share * 100}%` }}
          />
        </div>
        <dl className="mt-4 flex flex-wrap justify-between gap-x-8 gap-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-dust">En circulación</dt>
            <dd>{formatNumber(details.circulatingSupply)} BTC</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-dust">Por minar</dt>
            <dd>{formatNumber(remaining)} BTC</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
