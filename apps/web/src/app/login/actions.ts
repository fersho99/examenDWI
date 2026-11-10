"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_USER, SESSION_COOKIE } from "@/lib/session";

export interface LoginState {
  error: string | null;
  attempt: number;
}

export async function login(
  previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // Latencia simulada: no existe un servidor de autenticación real.
  await new Promise((resolve) => setTimeout(resolve, 500));

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (email !== DEMO_USER.email || password !== DEMO_USER.password) {
    return {
      error: "El correo o la contraseña no coinciden con el usuario demo.",
      attempt: previous.attempt + 1,
    };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, "demo", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect("/dashboard");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
