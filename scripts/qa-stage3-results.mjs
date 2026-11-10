import fs from "node:fs";
import { createHash } from "node:crypto";
const dir = "audit-evidence/qa-stage3";
const read = file => JSON.parse(fs.readFileSync(`${dir}/${file}`, "utf8"));
const latest = prefix => fs.readdirSync(dir).filter(f => f.startsWith(prefix) && f.endsWith(".json")).sort().at(-1);
const cases = [], sources = [];
const add = (suite, file) => { const data = read(file); sources.push(file); for (const r of data.results ?? data) cases.push({ suite, ...r, evidence: file }); };
for (const file of [latest("functional-"), latest("edges-"), "security-final.json", "final-smoke.json", "real-follow-up.json"]) add("Integración real local", file);
const configuration = read("configuration-concurrency-after.json");
cases.push({ suite: "Integración real local", id: "CONFIGURATION-AUTOSAVE-CONCURRENCY", status: configuration.status, evidence: "configuration-concurrency-after.json" });
for (const file of ["browser/results.json", "browser/extra-results.json"]) add("Navegador real local", file);
add("Técnicas y regresión aislada", "checks/results.json");
cases.push({ suite: "Técnicas y regresión aislada", id: "BUILD-FINAL", status: "PASS", command: "npm run build", exitCode: 0, evidence: "checks/build.log" });
cases.push({ suite: "Técnicas y regresión aislada", id: "ESLINT-QA-SCRIPTS", status: "PASS", command: "npx eslint ... --quiet", exitCode: 0, evidence: "checks/lint-final.log" });
add("Restauración y seguridad Supabase", "original-restored.json");
add("Restauración y seguridad Supabase", "original-stability.json");
cases.push({ suite: "Restauración y seguridad Supabase", id: "SOURCE-43-TABLES-UNCHANGED", status: read("source-unchanged.json").all43PublicTablesUnchanged ? "PASS" : "FAIL", evidence: "source-unchanged.json" });
const hash = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
cases.push({ suite: "Restauración y seguridad Supabase", id: "ORIGINAL-ENV-UNCHANGED", status: hash(".env") === hash(".tmp/qa-postgres/original.env.private") ? "PASS" : "FAIL" });
const pending = {
  BLOCKED: [
    ["DOC-POSITIVE-UPLOAD", "No hay Storage de desarrollo: carga y asociación positiva de un archivo real pendientes."],
    ["DOC-REVIEW-STATES", "Ciclo real pendiente/aprobado/rechazado/reemplazo requiere documento previamente cargado en Storage seguro."],
    ["DOC-DOWNLOAD-OWNERSHIP", "Descarga, visualización y acceso a documento existente ajeno requieren archivos de desarrollo."],
    ["PHYSICAL-CAMERA", "No se dispuso de cámara física; los endpoints QR sí se probaron realmente."],
    ["SMTP-DELIVERY", "SMTP externo deshabilitado; las notificaciones internas sí se comprobaron en PostgreSQL."],
  ],
  "NOT TESTED": [
    ["OFFER-REAL-TIME-EXPIRY", "No se esperó la caducidad de una oferta por transcurso real de tiempo; no se falsificó el reloj."],
    ["IMPORT-FILE-UI-LARGE-INVALID", "Se ejecutó import-upsert real y exportación XLSX; no la carga completa desde archivo grande/inválido en la UI."],
    ["SUSTAINED-LARGE-LOAD", "Concurrencia y paginación probadas con datos ficticios acotados; sin prueba sostenida ni dataset masivo."],
    ["NETWORK-LOSS-DURING-COMMIT", "Se verificó navegación offline y recuperación; no interrupción de un POST durante su commit."],
    ["SELF-REVIEW-PENDING-IDENTITY", "Se denegó revisión a roles no autorizados; no se ejecutó autoaprobación con la identidad de la propia solicitud pendiente."],
    ["PHYSICAL-MOBILE-OTHER-BROWSERS", "Responsive verificado en Chrome con viewport emulado; sin dispositivos físicos ni otros navegadores."],
    ["EXHAUSTIVE-ALL-ROUTES-STATES", "La matriz ejecutada no cubre cada verbo de los 169 archivos de rutas API ni todas las variantes visuales."],
  ],
};
for (const [status, rows] of Object.entries(pending)) for (const [id, detail] of rows) cases.push({ suite: "Pendientes explícitos", id, status, detail });
const totals = cases.reduce((a, r) => (a[r.status] = (a[r.status] ?? 0) + 1, a), {});
const suites = [...new Set(cases.map(r => r.suite))].map(suite => ({ suite, totals: cases.filter(r => r.suite === suite).reduce((a, r) => (a[r.status] = (a[r.status] ?? 0) + 1, a), {}) }));
fs.writeFileSync(`${dir}/qa-results.json`, JSON.stringify({ checkedAt: new Date().toISOString(), counting: "Final case instances per named suite; several cases contain multiple HTTP/SQL assertions. Historical failed runs retained separately, not summed as unresolved defects.", totals, suites, sources, cases }, null, 2));
console.log(JSON.stringify({ totals, suites }));
