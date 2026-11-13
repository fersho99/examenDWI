const FACTS = [
  { label: "Génesis", value: "3 ene 2009" },
  { label: "Un bloque cada", value: "~10 minutos" },
  { label: "Recompensa", value: "3.125 BTC" },
  { label: "Suministro máximo", value: "21,000,000" },
  { label: "Algoritmo", value: "SHA-256" },
  { label: "Consenso", value: "Prueba de trabajo" },
  { label: "Ajuste de dificultad", value: "2,016 bloques" },
  { label: "1 BTC equivale a", value: "100 M de satoshis" },
];

function Blocks({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden} className="flex shrink-0 items-center">
      {FACTS.map((fact) => (
        <li key={fact.label} className="flex items-center">
          <div className="w-52 rounded-2xl border border-line bg-panel px-5 py-4">
            <p className="font-mono text-[11px] tracking-wider text-dust uppercase">
              {fact.label}
            </p>
            <p className="mt-1.5 font-medium whitespace-nowrap">{fact.value}</p>
          </div>
          <span aria-hidden className="h-px w-8 bg-btc/50" />
        </li>
      ))}
    </ul>
  );
}

export function BlockChain() {
  return (
    <div className="chain overflow-hidden border-y border-line py-6 [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
      <div className="chain-track flex w-max">
        <Blocks />
        <Blocks hidden />
      </div>
    </div>
  );
}
