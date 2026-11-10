import { createAuthClient } from "better-auth/react";

/** Cliente del navegador: misma origen que la API, así la cookie httpOnly viaja sola. */
export const authClient = createAuthClient();
