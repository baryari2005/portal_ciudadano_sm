import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const mode = process.argv[2];
if (!["build", "serve", "dev", "restore"].includes(mode)) throw new Error("Use build, serve, dev or restore.");
const root = path.resolve(".tmp/qa-postgres");
const original = path.join(root, "original.env.private");
if (!fs.existsSync(original)) fs.copyFileSync(".env", original, fs.constants.COPYFILE_EXCL);
if (createHash("sha256").update(fs.readFileSync(original)).digest("hex") !== createHash("sha256").update(fs.readFileSync(".env")).digest("hex")) throw new Error("Original .env changed; manual review required.");
const env = { ...process.env };
if (mode !== "restore") {
  const config = fs.readFileSync(path.join(root, "connection.env"), "utf8");
  const connection = /^DATABASE_URL="([^"]+)"/m.exec(config)?.[1];
  const url = new URL(connection);
  if (url.hostname !== "127.0.0.1" || url.port !== "55432" || url.pathname !== "/mas_sanmiguel_qa") throw new Error("QA database must be local.");
  Object.assign(env, { DATABASE_URL: connection, DIRECT_URL: connection,
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:1", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "qa-disabled",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "qa-disabled", SUPABASE_SERVICE_ROLE_KEY: "qa-disabled",
    SMTP_HOST: "127.0.0.1", SMTP_PORT: "1", SMTP_USER: "", SMTP_PASS: "", SMTP_FROM: "qa@example.invalid",
    OPENAI_API_KEY: "", APP_URL: "http://localhost:3000", NEXT_TELEMETRY_DISABLED: "1" });
}
const next = path.resolve("node_modules/next/dist/bin/next");
if (mode === "build") {
  const result = spawnSync("npm.cmd", ["run", "build"], { env, stdio: "inherit", windowsHide: true, shell: true });
  process.exitCode = result.status ?? 1;
} else {
  const stdout = fs.openSync(path.join(root, `${mode}-server.log`), "a");
  const child = spawn(process.execPath, [next, mode === "serve" ? "start" : "dev", "--port", "3000"], { env, cwd: process.cwd(), detached: true, windowsHide: true, stdio: ["ignore", stdout, stdout] });
  fs.writeFileSync(path.join(root, `${mode}-server.pid`), String(child.pid));
  child.unref();
  console.log(JSON.stringify({ mode, pid: child.pid, port: 3000, originalEnvUnchanged: true, database: mode === "restore" ? "original configuration" : "independent local QA" }));
}
