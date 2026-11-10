// Genera las pantallas estáticas de la APK en apps/web/out (multiplataforma, sin cross-env).
import { spawnSync } from "node:child_process";

const result = spawnSync("npx next build", {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, BUILD_TARGET: "mobile" },
});
process.exit(result.status ?? 1);
