import { formatClock } from "@/lib/format";

export function LiveStatus({
  updatedAt,
  offline,
}: {
  updatedAt: number;
  offline: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-dust">
      <span
        aria-hidden
        className={`relative size-2 rounded-full ${offline ? "bg-dust" : "live-dot bg-up text-up"}`}
      />
      {offline ? "Datos con retraso" : "En vivo"} · {formatClock(updatedAt)}
    </span>
  );
}
