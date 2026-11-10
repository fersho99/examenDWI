"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { Viewer } from "@/server/session";

export function AccountBar({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (viewer.mode === "open") {
    return (
      <p className="mb-6 text-sm text-dust">
        Acceso abierto: la base de datos no está configurada, así que no se piden cuentas.
      </p>
    );
  }

  return (
    <div className="mb-6 flex items-center justify-between gap-4 text-sm">
      <span className="truncate text-dust">{viewer.name}</span>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await authClient.signOut();
          router.replace("/login");
          router.refresh();
        }}
        className="press min-h-12 rounded-full px-3 text-sand hover:text-cream disabled:opacity-60"
      >
        {pending ? "Saliendo…" : "Salir"}
      </button>
    </div>
  );
}
