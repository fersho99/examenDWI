"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { authClient } from "@/lib/auth-client";

const FIELD =
  "mt-2 w-full min-h-12 rounded-xl border border-line bg-panel px-4 text-base text-cream placeholder:text-dust transition-colors duration-150 focus:border-btc focus:outline-none";

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "El correo o la contraseña no coinciden.",
  SIGNUP_CLOSED: "El registro está cerrado: esta app ya tiene dueño. Entra con tu cuenta.",
  USER_ALREADY_EXISTS: "Ese correo ya tiene cuenta. Entra con ella.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ese correo ya tiene cuenta. Entra con ella.",
  PASSWORD_TOO_SHORT: "La contraseña necesita al menos 10 caracteres.",
};

function describe(error: { code?: string | undefined; status?: number | undefined }) {
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error.status === 429) return "Demasiados intentos. Espera un minuto y vuelve a probar.";
  return "No pudimos completar el acceso. Revisa tu conexión e intenta de nuevo.";
}

/** Solo rutas internas: evita redirigir a otro sitio con ?next=. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}

export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    setPending(true);
    setError(null);
    const result =
      mode === "signin"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: name || email.split("@")[0]! });
    setPending(false);

    if (result.error) {
      setError(describe(result.error));
      return;
    }
    router.replace(safeNext(next));
    router.refresh();
  }

  const signup = mode === "signup";

  return (
    <div className="rise mt-10" style={{ "--delay": "70ms" } as React.CSSProperties}>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {signup ? "Crea tu cuenta" : "Entra a Bloque 21"}
      </h1>
      <p className="mt-2 text-sand">
        {signup
          ? "La primera cuenta queda como dueña de la app; después el registro se cierra."
          : "Tu sesión dura 30 días en este dispositivo."}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        {signup && (
          <label className="block text-sm font-medium">
            Nombre
            <input name="name" autoComplete="name" className={FIELD} placeholder="Cómo te llamamos" />
          </label>
        )}
        <label className="block text-sm font-medium">
          Correo
          <input name="email" type="email" required autoComplete="email" inputMode="email" className={FIELD} />
        </label>
        <label className="block text-sm font-medium">
          Contraseña
          <span className="relative block">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={10}
              autoComplete={signup ? "new-password" : "current-password"}
              className={`${FIELD} pr-14`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute top-2 right-1 flex size-12 items-center justify-center rounded-full text-sand hover:text-cream"
            >
              {showPassword ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
            </button>
          </span>
          {signup && <span className="mt-1 block text-sm text-dust">Mínimo 10 caracteres.</span>}
        </label>

        {error && (
          <p role="alert" className="text-sm text-down">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="press min-h-12 w-full rounded-full bg-btc px-6 font-semibold text-ink hover:bg-[#ffa63d] disabled:opacity-60"
        >
          {pending ? "Un momento…" : signup ? "Crear cuenta" : "Entrar"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(signup ? "signin" : "signup");
          setError(null);
        }}
        className="mt-4 min-h-12 text-sm text-sand underline-offset-4 hover:text-cream hover:underline"
      >
        {signup ? "Ya tengo cuenta" : "Primera vez aquí: crear la cuenta"}
      </button>
    </div>
  );
}
