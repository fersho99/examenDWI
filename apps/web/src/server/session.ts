import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, isAuthConfigured } from "./auth";

export type Viewer = { mode: "signed-in"; name: string; email: string } | { mode: "open" };

/**
 * Exige sesión válida (comprobada contra Neon, no solo la cookie).
 * Sin base de datos configurada la app queda abierta y la interfaz lo dice.
 */
export async function requireViewer(next: string): Promise<Viewer> {
  if (!isAuthConfigured()) return { mode: "open" };
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { mode: "signed-in", name: session.user.name, email: session.user.email };
}
