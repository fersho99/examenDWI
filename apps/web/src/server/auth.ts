import { hash, verify } from "@node-rs/argon2";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { count } from "drizzle-orm";
import type { Db } from "./db/client";
import { getDb } from "./db/client";
import * as schema from "./db/schema";

// Argon2id con los parámetros recomendados por OWASP (19 MiB, 2 iteraciones).
const ARGON2 = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const SIGNUP_CLOSED = "SIGNUP_CLOSED";

export function createAuth(db: Db, secret = process.env.BETTER_AUTH_SECRET) {
  return betterAuth({
    secret,
    baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      password: {
        hash: (password) => hash(password, ARGON2),
        verify: ({ hash: stored, password }) => verify(stored, password),
      },
    },
    session: {
      // 30 días, renovada al usarse a diario: cómoda en el teléfono.
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: { enabled: true, window: 60, max: 30 },
    databaseHooks: {
      user: {
        create: {
          // La primera cuenta es la del dueño; después el registro queda cerrado.
          before: async (data) => {
            const [row] = await db.select({ total: count() }).from(schema.user);
            if ((row?.total ?? 0) > 0) {
              throw new APIError("FORBIDDEN", {
                code: SIGNUP_CLOSED,
                message: "El registro está cerrado: esta app ya tiene dueño.",
              });
            }
            return { data };
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let instance: Auth | null = null;

/** Se crea al primer uso para que compilar no exija la base de datos. */
export function getAuth(): Auth {
  instance ??= createAuth(getDb());
  return instance;
}

/** La autenticación solo funciona con base de datos y secreto configurados. */
export function isAuthConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);
}
