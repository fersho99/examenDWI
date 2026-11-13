"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const ITEMS = [
  { href: "/app", label: "Precios", icon: "M4 18l5-6 4 3 7-9" },
  { href: "/app/portafolio", label: "Portafolio", icon: "M4 7h16v12H4zM8 7V5h8v2" },
  { href: "/app/alertas", label: "Alertas", icon: "M6 16V11a6 6 0 1112 0v5l2 2H4zM10 20h4" },
  { href: "/app/convertir", label: "Convertir", icon: "M5 9h13l-4-4M19 15H6l4 4" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/app") {
    // Precios incluye el detalle de cada moneda.
    return !ITEMS.some((item) => item.href !== "/app" && pathname.startsWith(item.href));
  }
  return pathname.startsWith(href);
}

/** Barra inferior al alcance del pulgar; cada destino mide al menos 56 px de alto. */
export function BottomNav() {
  // La ruta solo se conoce al pedir la página: mientras tanto, la misma barra sin pestaña activa.
  return (
    <Suspense fallback={<Nav pathname={null} />}>
      <CurrentNav />
    </Suspense>
  );
}

function CurrentNav() {
  return <Nav pathname={usePathname()} />;
}

function Nav({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 bg-ink/95 backdrop-blur"
      style={{ paddingBottom: "var(--inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {ITEMS.map((item) => {
          const active = pathname !== null && isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`press flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${active ? "text-btc" : "text-sand hover:text-cream"}`}
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
