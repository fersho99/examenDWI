import { connection } from "next/server";
import type { ReactNode } from "react";
import { requireViewer } from "@/server/session";

/** Pide sesión antes de mostrar una pantalla cuyos datos viven en el teléfono. */
export async function Guard({ next, children }: { next: string; children: ReactNode }) {
  await connection();
  await requireViewer(next);
  return children;
}

export function ScreenSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="skeleton h-8 w-40" />
      <div className="skeleton h-14 w-56" />
      <div className="skeleton h-24 w-full" />
      <div className="skeleton h-24 w-full" />
    </div>
  );
}
