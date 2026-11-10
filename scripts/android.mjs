// Compila e instala las APK de depuración del teléfono y del reloj.
// Uso: node scripts/android.mjs <phone|watch> <build|install|connect>
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const envFile = join(root, ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const [target, action] = process.argv.slice(2);
const isWindows = process.platform === "win32";
const mode = process.env.BLOQUE21_ENV === "dev" ? "dev" : "prod";

const projects = {
  phone: {
    gradleDir: join(root, "apps/android/android"),
    apk: join(root, "apps/android/android/app/build/outputs/apk/debug/app-debug.apk"),
    serial: process.env.ADB_PHONE,
  },
  watch: {
    gradleDir: join(root, "apps/wear"),
    apk: join(root, "apps/wear/app/build/outputs/apk/debug/app-debug.apk"),
    serial: process.env.ADB_WATCH,
  },
};

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  // En Windows los .bat y npx necesitan cmd: se arma una sola línea con comillas
  // en las partes que llevan espacios. Los argumentos salen de este script, no del usuario.
  const quote = (part) => (/\s/.test(part) ? `"${part}"` : part);
  const result = isWindows
    ? spawnSync([command, ...args].map(quote).join(" "), { stdio: "inherit", shell: true, ...options })
    : spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.status !== 0) fail(`${command} terminó con código ${result.status}`);
}

/** Gradle 8.14 no corre con JDK 25 (el de Android Studio): se busca un JDK 21. */
function javaHome() {
  if (process.env.BLOQUE21_JAVA_HOME) return process.env.BLOQUE21_JAVA_HOME;
  const current = process.env.JAVA_HOME ?? "";
  if (/jdk-?21/i.test(current)) return current;
  const adoptium = "C:\\Program Files\\Eclipse Adoptium";
  if (isWindows && existsSync(adoptium)) {
    const jdk21 = readdirSync(adoptium).find((name) => name.startsWith("jdk-21"));
    if (jdk21) return join(adoptium, jdk21);
  }
  if (current) return current;
  fail("No encontré un JDK 21. Instálalo o define BLOQUE21_JAVA_HOME en .env.local.");
}

function gradle(project, args) {
  const env = { ...process.env, JAVA_HOME: javaHome() };
  // Ruta absoluta: cmd no siempre busca ejecutables en la carpeta actual.
  const wrapper = join(project.gradleDir, isWindows ? "gradlew.bat" : "gradlew");
  run(wrapper, args, { cwd: project.gradleDir, env });
}

function adb(project, args) {
  run("adb", [...(project.serial ? ["-s", project.serial] : []), ...args]);
}

function apiOrigin() {
  if (mode === "dev") return "http://localhost:3000";
  const url = process.env.BLOQUE21_URL?.replace(/\/+$/, "");
  if (!url) fail("Falta BLOQUE21_URL en .env.local (o usa BLOQUE21_ENV=dev para el servidor local).");
  return url;
}

function build(name) {
  const project = projects[name];
  console.log(`Compilando ${name === "phone" ? "teléfono" : "reloj"} en modo ${mode} contra ${apiOrigin()}`);
  if (name === "phone") {
    run("npx", ["cap", "sync", "android"], { cwd: join(root, "apps/android") });
    gradle(project, ["assembleDebug"]);
  } else {
    gradle(project, ["assembleDebug", `-Pbloque21.apiBaseUrl=${apiOrigin()}`]);
  }
  console.log(`\n✓ APK: ${project.apk}`);
}

function install(name) {
  const project = projects[name];
  build(name);
  adb(project, ["install", "-r", project.apk]);
  // En dev el dispositivo alcanza tu servidor local como localhost:3000.
  if (mode === "dev") adb(project, ["reverse", "tcp:3000", "tcp:3000"]);
  console.log("\n✓ Instalada. Abre Bloque 21 en el dispositivo.");
}

function connect() {
  const address = process.env.ADB_WATCH;
  if (!address) fail("Define ADB_WATCH=IP:PUERTO en .env.local (el de la pantalla Depuración inalámbrica).");
  run("adb", ["connect", address]);
  run("adb", ["devices", "-l"]);
}

if (!(target in projects)) fail("Primer argumento: phone o watch.");
if (action === "build") build(target);
else if (action === "install") install(target);
else if (action === "connect" && target === "watch") connect();
else fail("Segundo argumento: build, install o connect (connect solo para watch).");
