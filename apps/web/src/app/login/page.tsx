import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/logo";
import { DEMO_USER } from "@/lib/session";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-14rem] left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-btc/10 blur-3xl"
      />
      <div className="relative w-full max-w-md">
        <div className="rise flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-sand hover:text-cream">
            Volver al inicio
          </Link>
        </div>
        <LoginForm demoEmail={DEMO_USER.email} demoPassword={DEMO_USER.password} />
      </div>
    </main>
  );
}
