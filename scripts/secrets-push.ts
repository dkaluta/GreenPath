/*
 * Copies .env to Cloudflare, so the deployed app has the same settings.
 *
 *     npm run secrets:push
 *
 * Cloudflare never sees .env (it is git-ignored, on purpose), and it needs
 * its lines in two different places:
 *
 *   - Lines WITHOUT a VITE_ prefix (SUPABASE_SECRET_KEY) are read by the
 *     server while it runs. They become the Worker's Secrets, with
 *     `wrangler secret bulk`. Deploys never wipe Secrets.
 *   - VITE_ lines are baked into the browser code while the app is built, so
 *     they become Build variables of the Worker's automatic builds, with
 *     `cf builds workers edit`. They are public anyway.
 *
 * SUPABASE_URL is skipped: the build adds it from VITE_SUPABASE_URL (see
 * vite.config.ts). Run this once, and again whenever a value changes; then
 * push to main (or retry the last build) so the new build variables apply.
 *
 * It never prints a value. You need to be signed in to Wrangler
 * (`npx wrangler login`) and to the cf CLI (`cf auth login`). See
 * docs/04-deploy.markdown.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = join(ROOT, ".env");

/** Added by the build, not by this script. */
const SKIP = new Set(["SUPABASE_URL"]);

/** KEY=VALUE lines from a .env file, without comments or quotes. */
export function parseEnv(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(
      line,
    );
    if (!match) continue;
    let value = match[2];
    const quoted = /^(["'])(.*)\1$/.exec(value);
    if (quoted) value = quoted[2];
    else value = value.replace(/\s+#.*$/, "");
    values[match[1]] = value;
  }
  return values;
}

/** The lines that belong in the build: the public VITE_ ones. */
export function buildVariables(env: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(env)
      .filter(([key, value]) => key.startsWith("VITE_") && value !== "")
      .map(([key, value]) => [key, { value, is_secret: false }]),
  );
}

/** The lines that belong on the Worker as secrets. */
export function serverSecrets(env: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(env).filter(
      ([key, value]) =>
        !key.startsWith("VITE_") &&
        !SKIP.has(key) &&
        value !== "" &&
        // A ${...} reference is filled in by Vite locally; it means nothing
        // to Cloudflare.
        !value.includes("${"),
    ),
  );
}

async function main() {
  if (!existsSync(ENV_FILE)) {
    console.error("No .env file. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }
  const env = parseEnv(readFileSync(ENV_FILE, "utf8"));
  const secrets = serverSecrets(env);
  const names = Object.keys(secrets);
  if (names.length === 0) {
    console.error("No server secrets in .env (lines without VITE_).");
    process.exit(1);
  }
  const worker = workerName();

  console.log(`Secrets for the ${worker} Worker: ${names.join(", ")}`);
  // The values go in on stdin, so they never appear in a command line.
  await run("npx", ["wrangler", "secret", "bulk", "--name", worker], {
    stdin: JSON.stringify(secrets),
  });

  const variables = buildVariables(env);
  const keys = Object.keys(variables);
  if (keys.length === 0) return;
  console.log(`Build variables: ${keys.join(", ")}`);
  const info = await run("cf", ["workers", "get", worker], { capture: true });
  const tag = JSON.parse(info.slice(info.indexOf("{"))).id as string;
  await run("cf", [
    "builds",
    "workers",
    "edit",
    tag,
    "--production-settings-environment-variables",
    JSON.stringify(variables),
  ]);
  console.log(
    "Done. Push to main, or retry the last build, so the build variables apply.",
  );
}

/** The Worker's name, from wrangler.jsonc. */
function workerName(): string {
  const config = readFileSync(join(ROOT, "wrangler.jsonc"), "utf8");
  const match = /"name"\s*:\s*"([^"]+)"/.exec(config);
  if (!match) throw new Error("No name in wrangler.jsonc");
  return match[1];
}

/** Runs a command, failing loudly. With capture, returns its stdout. */
function run(
  command: string,
  args: string[],
  options: { stdin?: string; capture?: boolean } = {},
): Promise<string> {
  const child = spawn(command, args, {
    cwd: ROOT,
    stdio: ["pipe", options.capture ? "pipe" : "inherit", "inherit"],
  });
  let output = "";
  child.stdout?.on("data", (chunk) => (output += chunk));
  child.stdin.end(options.stdin ?? "");
  return new Promise((resolve, reject) =>
    child.on("close", (code) =>
      code === 0
        ? resolve(output)
        : reject(new Error(`${command} ${args[0]} failed (exit ${code})`)),
    ),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: Error) => {
    console.error(error.message);
    process.exit(1);
  });
}
