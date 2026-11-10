import fs from "node:fs";
import { spawnSync } from "node:child_process";
const output = process.env.QA_EVIDENCE_DIR ? `${process.env.QA_EVIDENCE_DIR}/checks` : "audit-evidence/qa-stage3/checks";
fs.mkdirSync(output, { recursive: true });
const env = { ...process.env, DATABASE_URL: "postgresql://qa:qa@127.0.0.1:1/isolated", DIRECT_URL: "postgresql://qa:qa@127.0.0.1:1/isolated", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:1", NEXT_PUBLIC_SUPABASE_ANON_KEY: "qa-disabled", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "qa-disabled", SUPABASE_SERVICE_ROLE_KEY: "qa-disabled" };
const scripts = ["test-existing-schema-activity-configuration.ts", "test-activity-drafts.ts", "test-indefinite-activities.ts", "test-optional-activity-professors.ts", "verify-activity-creation-paths.ts", "verify-citizen-enrollment-paths.ts", "verify-class-reservation-overlap.ts", "test-reception-manual-presentation.ts", "test-dashboard-calendar-regressions.ts", "test-activity-schema.ts", "test-attendance-qr-time.ts"];
const commands = [
  ["prisma-validate", "npx prisma validate", "npx.cmd", ["prisma", "validate"], true],
  ["typecheck", "npm run typecheck", "npm.cmd", ["run", "typecheck"], true],
  ["lint", "npm run lint", "npm.cmd", ["run", "lint"], true],
  ...scripts.map(file => [file, `npx tsx scripts/${file}`, process.execPath, ["node_modules/tsx/dist/cli.mjs", `scripts/${file}`], false]),
];
const results = [];
for (const [id, command, executable, args, shell] of commands) {
  const start = Date.now(), result = spawnSync(executable, args, { env, shell, windowsHide: true, encoding: "utf8", timeout: 240000, maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(`${output}/${id}.log`, `${result.stdout ?? ""}\n${result.stderr ?? ""}${result.error?.message ?? ""}`);
  results.push({ id, command, status: result.status === 0 ? "PASS" : "FAIL", exitCode: result.status, elapsedMs: Date.now() - start, isolated: id.endsWith(".ts") });
  fs.writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(`${id}: ${results.at(-1).status}`);
}
if (results.some(r => r.status === "FAIL")) process.exitCode = 1;
