import { CHART_RANGES, type ChartRange } from "@/lib/types";

export function RangeControl({
  selected,
  onSelect,
}: {
  selected: ChartRange;
  onSelect: (range: ChartRange) => void;
}) {
  const index = CHART_RANGES.findIndex((range) => range.value === selected);

  return (
    <div
      role="group"
      aria-label="Rango de la gráfica"
      className="relative grid grid-cols-5 rounded-full border border-line bg-panel p-1"
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/5)] rounded-full bg-btc transition-transform duration-200 ease-[var(--ease-strong)]"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {CHART_RANGES.map((range) => {
        const active = range.value === selected;
        return (
          <button
            key={range.value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (!active) onSelect(range.value);
            }}
            className={`relative z-10 min-h-11 min-w-12 rounded-full px-2 text-sm font-medium transition-colors duration-150 sm:min-w-14 ${active ? "text-ink" : "text-sand hover:text-cream"}`}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
