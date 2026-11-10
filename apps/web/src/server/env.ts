import "server-only";
import { z } from "zod";

const schemas = {
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  CRON_SECRET: z.string().min(32, "CRON_SECRET debe tener al menos 32 caracteres"),
} as const;

type EnvName = keyof typeof schemas;

/** Lee y valida una variable de entorno en el momento en que se necesita, no al compilar. */
export function env(name: EnvName): string {
  const result = schemas[name].safeParse(process.env[name]);
  if (!result.success) {
    throw new Error(`Variable de entorno ${name} ausente o inválida: ${result.error.issues[0]?.message}`);
  }
  return result.data;
}
