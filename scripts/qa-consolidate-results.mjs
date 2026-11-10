import fs from "node:fs";
const root = "audit-evidence/qa-stage2";
const files = ["real-endpoint-results.json", "real-regressions.json", "real-follow-up.json", "real-catalogs.json", "real-turns.json", "ownership-after.json", "final-smoke.json", "browser/desktop-navigation-first-run.json", "browser/results.json", "browser/focused-results.json", "browser/actions-results.json"];
const cases = new Map(), requests = [];
const aliases = { "DRAFT-CONCURRENT-AUTOSAVE-RETEST": "DRAFT-CONCURRENT-AUTOSAVE", "ACCESS-REVIEW-reception-PATCH-DENIED-RETEST": "RBAC-RECEPTION-APPROVAL-DENIED" };
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(`${root}/${file}`, "utf8"));
  for (const row of data.results) {
    const id = aliases[row.id] ?? row.id;
    const result = { ...row, id, evidence: `${root}/${file}`, kind: file.startsWith("browser/") ? "real-browser" : "real-api-postgresql" };
    if (id.startsWith("UI-NAV-") && row.detail?.path !== id.slice("UI-NAV-".length)) { result.status = "NOT TESTED"; result.detail = "The driver requested /establishments, which is not the facilities route. /facilities has not been visually verified; API CRUD did pass. Excluded from PASS."; }
    cases.set(id, result);
  }
  requests.push(...(data.requests ?? data.calls ?? []));
}
const concurrency = JSON.parse(fs.readFileSync(`${root}/configuration-concurrency-after.json`, "utf8"));
cases.set("CONFIGURATION-CONCURRENT-AUTOSAVE", { id: "CONFIGURATION-CONCURRENT-AUTOSAVE", status: concurrency.status, evidence: `${root}/configuration-concurrency-after.json`, kind: "real-prisma-and-api-postgresql" });
const blocked = [
  ["DOC-VALID-UPLOAD", "Valid PDF/JPG/PNG upload: independent Supabase Storage unavailable; production credentials disabled during QA."],
  ["DOC-DOWNLOAD-REVIEW", "Download, approval, rejection and versioning of a genuinely uploaded document require the independent Storage prerequisite."],
  ["DOC-AVATAR-UPLOAD", "Avatar/profile image storage upload: no independent Storage backend."],
  ["MAIL-DELIVERY", "Real password recovery/access-request email delivery requires independent mail configuration."],
  ["QR-PHYSICAL-CAMERA", "Physical camera capture, flash and actual-device camera permissions were not exercised in headless Chrome; backend QR issue/validation did pass."],
];
const untested = [
  ["FULL-IMPORT-EXPORT", "Bulk citizen import/export and large-file scenarios were not executed."],
  ["FULL-ACCESS-REQUEST-LIFECYCLE", "Full public/reception registration, approval and rejection lifecycle not executed; authorization denials were executed."],
  ["FULL-CAPACITY-WAITLIST", "Capacity saturation, waitlist promotion and simultaneous reservation for the last available seat not executed."],
  ["FULL-RESERVATION-LIFECYCLE", "Reservation, cancellation justification, offers and no-show escalation not fully executed."],
  ["FULL-ATTENDANCE-LIFECYCLE", "Attendance close/reopen/correction and physical QR attendance not fully executed; teacher mark-present and historical preservation were executed."],
  ["FULL-QR-ACCESS-DECISIONS", "Every QR access decision, permitted time window, revocation and reuse scenario not executed; real digital QR issue and person identification were executed."],
  ["FULL-ROLE-PERMISSION-MATRIX", "Every combination of permission and route was not exercised; tested combinations are listed individually."],
  ["FULL-CRUD-DELETE", "Permanent deletion of the created fixtures was not executed; records retained for user review."],
  ["ASSISTANT-EXTERNAL-INTEGRATIONS", "Assistant and external geocoding/error fallbacks not exhaustively exercised; OpenAI credentials disabled in QA."],
  ["REAL-DEVICES-ACCESSIBILITY", "Physical Android/iOS devices, screen readers and keyboard-only workflows not comprehensively tested."],
  ["LOAD-SOAK", "Long-running load, massive date windows and operational endurance tests not executed."],
  ["ALL-ADMIN-VIEWPORTS", "All administration/teacher screens at all desktop sizes not executed; navigation was verified at 1440x900. Reception/citizen received all seven sizes."],
];
for (const [id, detail] of blocked) cases.set(id, { id, status: "BLOCKED", detail });
for (const [id, detail] of untested) cases.set(id, { id, status: "NOT TESTED", detail });
const isolated = JSON.parse(fs.readFileSync(`${root}/isolated-tests-final.json`, "utf8").replace(/^\uFEFF/, ""));
const summary = { application: "actual workspace at localhost:3000", apiInterception: false, totals: Object.fromEntries(["PASS", "FAIL", "BLOCKED", "NOT TESTED"].map(status => [status, [...cases.values()].filter(row => row.status === status).length])), isolatedSuites: { passed: isolated.filter(row => row.exitCode === 0).length, failed: isolated.filter(row => row.exitCode !== 0).length, countedAsRealFunctionalPass: false }, cases: [...cases.values()] };
fs.writeFileSync(`${root}/qa-results.json`, JSON.stringify(summary, null, 2));
const inventory = JSON.parse(fs.readFileSync(`${root}/api-inventory.json`, "utf8"));
const paths = new Set(requests.map(r => r.route ?? r.path).filter(Boolean).map(route => new URL(route, "http://localhost:3000").pathname));
const coverage = inventory.map(row => {
  const route = "/" + row.file.replace(/^src\/app\//, "").replace(/\/route\.ts$/, "");
  const regex = new RegExp("^" + route.split("/").map(segment => segment.startsWith("[") ? "[^/]+" : segment).join("/") + "$");
  return { ...row, route, responseObserved: [...paths].some(p => regex.test(p)), testedAllMethodsAndBusinessCases: false };
});
fs.writeFileSync(`${root}/api-coverage.json`, JSON.stringify({ totalRouteFiles: coverage.length, withObservedResponse: coverage.filter(row => row.responseObserved).length, note: "Response observed is not proof that every method/business case passed. Route inventory includes untested routes.", routes: coverage }, null, 2));
console.log(JSON.stringify({ totals: summary.totals, isolatedSuites: summary.isolatedSuites, routeFiles: coverage.length, withObservedResponse: coverage.filter(row => row.responseObserved).length }));
