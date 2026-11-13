import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { createAuth, type Auth } from "./auth";
import type { Db } from "./db/client";
import * as schema from "./db/schema";

const migrationsDir = new URL("../../drizzle/", import.meta.url);

let auth: Auth;
let db: Db;

beforeEach(async () => {
  const client = new PGlite();
  for (const file of readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort()) {
    const sql = readFileSync(new URL(file, migrationsDir), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) await client.exec(statement);
  }
  db = drizzle({ client, schema }) as unknown as Db;
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  auth = createAuth(db, "s".repeat(40));
});

const owner = { email: "dueno@bloque21.test", password: "una-clave-larga", name: "Dueño" };

describe("autenticación contra Postgres", () => {
  it("registra al dueño y guarda la contraseña con Argon2id", async () => {
    const result = await auth.api.signUpEmail({ body: owner });
    expect(result.user.email).toBe(owner.email);

    const [stored] = await db.select().from(schema.account);
    expect(stored?.password).toMatch(/^\$argon2id\$/);
    expect(stored?.password).not.toContain(owner.password);
  });

  it("cierra el registro después de la primera cuenta", async () => {
    await auth.api.signUpEmail({ body: owner });
    await expect(
      auth.api.signUpEmail({ body: { email: "otra@bloque21.test", password: "otra-clave-larga", name: "Otra" } }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(await db.select().from(schema.user)).toHaveLength(1);
  });

  it("acepta la contraseña correcta y rechaza la incorrecta", async () => {
    await auth.api.signUpEmail({ body: owner });

    const ok = await auth.api.signInEmail({ body: { email: owner.email, password: owner.password } });
    expect(ok.token).toBeTruthy();

    await expect(
      auth.api.signInEmail({ body: { email: owner.email, password: "no-es-la-clave" } }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rechaza contraseñas de menos de 10 caracteres", async () => {
    await expect(
      auth.api.signUpEmail({ body: { ...owner, password: "corta" } }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
