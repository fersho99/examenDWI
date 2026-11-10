import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-lg bg-btc text-lg font-bold text-ink"
      >
        ₿
      </span>
      Bloque 21
    </Link>
  );
}
