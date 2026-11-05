import type { Sentiment } from "@/lib/types";

export function SentimentMeter({ sentiment }: { sentiment: Sentiment | null }) {
  return (
    <section aria-labelledby="sentiment-title" className="rounded-3xl border border-line bg-panel p-6">
      <h2 id="sentiment-title" className="font-display text-xl font-semibold">
        Ánimo del mercado
      </h2>

      {sentiment ? (
        <>
          <p className="mt-5 flex items-baseline gap-3">
            <span className="text-5xl font-semibold tracking-tight">{sentiment.value}</span>
            <span className="text-lg text-sand">{sentiment.label}</span>
          </p>
          <div
            role="meter"
            aria-label="Índice de miedo y codicia"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={sentiment.value}
            aria-valuetext={`${sentiment.value}, ${sentiment.label}`}
            className="relative mt-6 h-2 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--color-down), var(--color-dust) 50%, var(--color-up))",
            }}
          >
            <span
              className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-panel bg-cream"
              style={{ left: `${sentiment.value}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-sm text-dust">
            <span>Miedo</span>
            <span>Codicia</span>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-sand">
            Índice diario de 0 a 100 basado en volatilidad, volumen y conversación
            en redes.
          </p>
        </>
      ) : (
        <p className="mt-5 text-sand">
          El índice no está disponible por ahora. Se actualizará en el siguiente
          ciclo.
        </p>
      )}
    </section>
  );
}
