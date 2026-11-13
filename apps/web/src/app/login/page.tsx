import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { isAuthConfigured } from "@/server/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="safe-area mx-auto w-full max-w-md flex-1 px-4">
      <div className="rise flex items-center justify-between">
        <Logo />
        <Link href="/" className="inline-flex min-h-12 items-center text-sm text-sand hover:text-cream">
          Volver al inicio
        </Link>
      </div>
      <Suspense>
        <Form searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next } = await searchParams;
  if (!isAuthConfigured()) {
    return (
      <div className="rise mt-10 space-y-3">
        <h1 className="font-display text-3xl font-semibold">El acceso aún no está configurado</h1>
        <p className="text-sand">
          Falta conectar la base de datos (DATABASE_URL y BETTER_AUTH_SECRET). Mientras tanto, la app de
          precios está abierta.
        </p>
        <Link href="/app" className="press inline-flex min-h-12 items-center rounded-full bg-btc px-6 font-semibold text-ink">
          Ver precios
        </Link>
      </div>
    );
  }
  return <LoginForm next={typeof next === "string" ? next : null} />;
}
