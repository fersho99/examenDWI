"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { login, type LoginState } from "./actions";
import { ArrowRightIcon, EyeIcon, EyeOffIcon } from "@/components/icons";

const INITIAL_STATE: LoginState = { error: null, attempt: 0 };

const FIELD =
  "mt-2 w-full rounded-xl border bg-ink px-4 py-3 text-base text-cream placeholder:text-dust transition-colors duration-150 focus:border-btc focus:outline-none";

export function LoginForm({
  demoEmail,
  demoPassword,
}: {
  demoEmail: string;
  demoPassword: string;
}) {
  const [state, action, pending] = useActionState(login, INITIAL_STATE);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.attempt === 0 || !card.current) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    card.current.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-8px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(-3px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 280, easing: "ease-out" },
    );
  }, [state.attempt]);

  const hasError = Boolean(state.error);
  const border = hasError ? "border-down" : "border-line";

  return (
    <div
      ref={card}
      className="rise mt-8 rounded-3xl border border-line bg-panel p-6 sm:p-8"
      style={{ "--delay": "70ms" } as React.CSSProperties}
    >
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Entra al panel
      </h1>
      <p className="mt-2 text-sand">
        Este acceso es una simulación y no se conecta a ningún servidor.
      </p>

      <form action={action} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">
          Correo
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={hasError}
            className={`${FIELD} ${border}`}
          />
        </label>

        <label className="block text-sm font-medium">
          Contraseña
          <span className="relative block">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={hasError}
              className={`${FIELD} ${border} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              className="press absolute top-2 right-1 flex size-11 items-center justify-center rounded-lg text-dust hover:text-cream"
            >
              {showPassword ? (
                <EyeOffIcon className="size-5" />
              ) : (
                <EyeIcon className="size-5" />
              )}
            </button>
          </span>
        </label>

        <p
          role="alert"
          className={`text-sm text-down ${state.error ? "rise" : "sr-only"}`}
        >
          {state.error}
        </p>

        <button
          type="submit"
          disabled={pending}
          className="press flex w-full items-center justify-center gap-2 rounded-xl bg-btc px-5 py-3 font-semibold text-ink hover:bg-[#ffa63d] disabled:cursor-wait disabled:opacity-80"
        >
          {pending ? (
            <>
              <span
                aria-hidden
                className="spinner size-4 rounded-full border-2 border-ink/30 border-t-ink"
              />
              Verificando…
            </>
          ) : (
            <>
              Iniciar sesión
              <ArrowRightIcon className="size-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-line p-4 text-sm">
        <p className="font-medium">Credenciales de demostración</p>
        <dl className="mt-2 space-y-1 font-mono text-xs text-sand">
          <div className="flex flex-wrap gap-2">
            <dt className="text-dust">correo:</dt>
            <dd className="break-all">{demoEmail}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-dust">contraseña:</dt>
            <dd>{demoPassword}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => {
            setEmail(demoEmail);
            setPassword(demoPassword);
          }}
          className="press mt-3 rounded-lg border border-line px-3 py-2 font-medium text-btc hover:border-btc"
        >
          Autocompletar
        </button>
      </div>
    </div>
  );
}
