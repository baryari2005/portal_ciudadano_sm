import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { realQaClient } from "./qa-real-client.mjs";

const stage3 = process.env.QA_BROWSER_STAGE3 === "1";
const catalog = process.env.QA_BROWSER_CATALOG === "1";
const extra = process.env.QA_BROWSER_EXTRA === "1";
const guard = await realQaClient(); await guard.db.$disconnect();
const origin = "http://localhost:3000", output = catalog ? "audit-evidence/citizen-catalog/browser" : stage3 ? "audit-evidence/qa-stage3/browser" : "audit-evidence/qa-stage2/browser";
const focused = process.env.QA_BROWSER_FOCUSED === "1";
const actionsOnly = process.env.QA_BROWSER_ACTIONS === "1";
const resultsFile = `${output}/${extra ? "extra-results" : actionsOnly ? "actions-results" : focused ? "focused-results" : "results"}.json`;
await fs.mkdir(output, { recursive: true });
const accounts = JSON.parse(await fs.readFile(".tmp/qa-postgres/accounts.private.json", "utf8"));
const tabs = await (await fetch("http://127.0.0.1:9224/json/list")).json();
const socket = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let seq = 0; const pending = new Map(), inflight = new Set(), loadedDocuments = new Set(), requests = [], exceptions = [], results = [];
function send(method, params = {}) { const id = ++seq; return new Promise((resolve, reject) => { const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout ${method}`)); }, 120000); pending.set(id, { resolve, reject, timeout }); socket.send(JSON.stringify({ id, method, params })); }); }
socket.onmessage = event => {
  const msg = JSON.parse(event.data);
  if (msg.id) { const p = pending.get(msg.id); if (!p) return; clearTimeout(p.timeout); pending.delete(msg.id); msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result); return; }
  if (msg.method === "Network.requestWillBeSent" && msg.params.request.url.startsWith(origin + "/api/") && !/\/api\/(server-time|citizen\/notifications)/.test(msg.params.request.url)) inflight.add(msg.params.requestId);
  if (["Network.loadingFinished", "Network.loadingFailed"].includes(msg.method)) inflight.delete(msg.params.requestId);
  if (msg.method === "Network.responseReceived" && msg.params.response.url.startsWith(origin + "/api/")) requests.push({ path: new URL(msg.params.response.url).pathname, status: msg.params.response.status });
  if (msg.method === "Page.lifecycleEvent" && msg.params.name === "load") loadedDocuments.add(msg.params.loaderId);
  if (msg.method === "Runtime.exceptionThrown") exceptions.push({ text: msg.params.exceptionDetails.text, url: msg.params.exceptionDetails.url, line: msg.params.exceptionDetails.lineNumber, description: msg.params.exceptionDetails.exception?.description });
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function evaluate(expression) { const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; }
async function until(expression, label) { const start = Date.now(), limit = start + 90000; let reloaded = false; while (Date.now() < limit) { if (await evaluate(`!!(${expression})`)) return; if (!reloaded && label === "manual search" && Date.now() - start > 15000) { reloaded = true; await send("Page.reload", { ignoreCache: true }); } await pause(200); } throw new Error(`Timed out: ${label}`); }
const visible = "el=>el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0";
async function fill(selector, value) { await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});const setter=Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`); }
async function clickVisible(expression) {
  await send("Page.bringToFront");
  await evaluate(`(${expression}).scrollIntoView({block:'center',behavior:'instant'})`);
  await pause(150);
  const box = await evaluate(`(()=>{const el=${expression};if(!el)throw new Error('Click target missing');const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return{x,y,hit:el.contains(document.elementFromPoint(x,y))}})()`);
  assert.ok(box.hit, "Click target is obscured");
  const point = { x: box.x, y: box.y };
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point, buttons: 0 });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", buttons: 1, clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", buttons: 0, clickCount: 1 });
}
async function idle() { const end = Date.now() + 90000; while (Date.now() < end) { await pause(400); if (!inflight.size) { await pause(500); if (!inflight.size) return; } } throw new Error("API requests did not settle."); }
async function selectVenue() {
  if (!await evaluate("location.pathname.startsWith('/select-venue')")) return;
  await until(`[...document.querySelectorAll('article')].filter(${visible}).some(el=>el.textContent.includes('QA_TEST Sede ficticia'))`, "real venue selection");
  await evaluate(`[...document.querySelectorAll('article')].filter(${visible}).find(el=>el.textContent.includes('QA_TEST Sede ficticia')).querySelector('button').click()`);
  await until("!location.pathname.startsWith('/select-venue')", "venue selected"); await idle();
}
async function navigate(route) {
  if (catalog) inflight.clear();
  const navigation = await send("Page.navigate", { url: origin + route });
  if (catalog && navigation.loaderId) {
    const deadline = Date.now() + 90000;
    while (!loadedDocuments.has(navigation.loaderId)) { if (Date.now() > deadline) throw new Error(`Document load timed out: ${route}`); await pause(100); }
  }
  await until(`document.readyState==='complete'&&location.pathname===${JSON.stringify(route.split('?')[0])}`, route); await idle(); await pause(1200); if (route.startsWith('/reception')) await selectVenue();
}
async function capture(name) { const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await fs.writeFile(`${output}/${name}.png`, Buffer.from(r.data, "base64")); }
async function test(id, work) { try { results.push({ id, status: "PASS", detail: await work() }); } catch (e) { let context; if (catalog) { try { context = await evaluate("({path:location.pathname,text:document.body?.innerText.slice(0,1000)})"); } catch {} } results.push({ id, status: "FAIL", detail: e.message, context }); } await fs.writeFile(resultsFile, JSON.stringify({ origin, apiInterception: false, results, requests, exceptions }, null, 2)); console.log(`${id}: ${results.at(-1).status}`); }
async function login(role) {
  await send("Storage.clearDataForOrigin", { origin, storageTypes: "all" });
  await navigate("/login"); await until("document.querySelector('#userId') && document.querySelector('#password')", "login controls");
  await until("Object.keys(document.querySelector('#userId')).some(key=>key.startsWith('__reactProps'))", "hydrated login");
  await pause(1000);
  const account = accounts.find(item => item.role === role);
  await fill("#userId", account.userId); await fill("#password", account.password); await pause(300);
  assert.equal(await evaluate("document.querySelector('#userId').value.length"), account.userId.length);
  console.log(`UI login ${role}: controls filled; submitting real form`);
  await evaluate("document.querySelector('form').requestSubmit()");
  await until("!location.pathname.startsWith('/login')", `real ${role} login`); await idle();
  console.log(`UI login ${role}: redirected`);
  if (await evaluate("location.pathname.startsWith('/select-venue')")) {
    await selectVenue();
  }
}
const sizes = [[320, 700], [375, 812], [390, 844], [430, 932], [1366, 768], [1440, 900], [1920, 1080]];
async function metrics() { return evaluate(`({width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,text:document.body.innerText.slice(0,1400),cards:[...document.querySelectorAll('[data-access-person-card]')].filter(${visible}).map(card=>{const a=card.querySelector('[data-slot=avatar]');const img=a?.querySelector('img');return{width:card.getBoundingClientRect().width,overflow:card.scrollWidth>card.clientWidth+1,avatarWidth:a?.getBoundingClientRect().width,photo:img?.getAttribute('src'),photoLoaded:!!img?.naturalWidth}})})`); }
try {
  await send("Page.enable"); await send("Page.setLifecycleEventsEnabled", { enabled: true }); await send("Emulation.setFocusEmulationEnabled", { enabled: true }); await send("Runtime.enable"); await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  // No Fetch interception, fabricated tokens, frozen clock or database adapters.
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  for (const role of (process.env.QA_BROWSER_ROLES ?? "admin,teacher,reception,citizen").split(",")) {
    await test(`UI-LOGIN-${role}`, async () => { await login(role); await capture(`${role}-home-1440`); return { path: await evaluate("location.pathname") }; });
    if (catalog) {
      const fixture = JSON.parse(await fs.readFile("audit-evidence/citizen-catalog/integration.json", "utf8")).fixtures.find(a => a.label === "indefinite-no-prof");
      assert.ok(fixture);
      for (const [width, height] of [[320,700],[375,812],[390,844],[430,932],[1440,900]].filter(([w]) => !process.env.QA_BROWSER_WIDTHS || process.env.QA_BROWSER_WIDTHS.split(",").includes(String(w)))) {
        await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
        await test(`CATALOG-CARDS-FILTER-${width}`, async () => {
          await navigate("/citizen/activities");
          await until(`[...document.querySelectorAll('input')].filter(${visible}).some(el=>el.placeholder.includes('Buscar'))`, "catalog search rendered");
          await evaluate(`[...document.querySelectorAll('input')].filter(${visible}).find(el=>el.placeholder.includes('Buscar')).id='qa-catalog-search'`);
          await fill("#qa-catalog-search", "indefinite-no-prof"); await pause(400);
          await until(`document.body.innerText.includes(${JSON.stringify(fixture.name)})`, "actual activity card");
          const m = await metrics(); assert.ok(m.documentWidth <= width + 1, `Overflow ${m.documentWidth}/${width}`);
          assert.ok(await evaluate(`[...document.images].filter(${visible}).some(img=>img.naturalWidth>0)`), "No activity image loaded");
          await capture(`catalog-${width}`);
          await fill("#qa-catalog-search", "QA_TEST_NONEXISTENT_CATALOG"); await pause(400);
          assert.ok(await evaluate("/No encontramos actividades|No hay actividades|No encontramos coincidencias|No hay resultados/.test(document.body.innerText)"));
          await fill("#qa-catalog-search", "indefinite-no-prof"); await pause(400);
          const filters = `[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.getAttribute('aria-label')==='Abrir filtros'||el.textContent.trim().startsWith('Filtros'))`;
          await clickVisible(filters);
          await until("!!document.querySelector('[data-slot=\"popover-content\"]')", "catalog filters open");
          await clickVisible(`[...document.querySelectorAll('[data-slot="popover-content"] label')].find(el=>el.textContent.trim()==='Aranceladas').querySelector('input')`);
          await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
          await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); await pause(400);
          assert.ok(await evaluate("/No encontramos actividades|No hay resultados/.test(document.body.innerText)"));
          await clickVisible(filters);
          await clickVisible(`[...document.querySelectorAll('[data-slot="popover-content"] label')].find(el=>el.textContent.trim()==='Gratuitas').querySelector('input')`);
          await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
          await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); await pause(400);
          await until(`document.body.innerText.includes(${JSON.stringify(fixture.name)})`, "cost filter restored activity");
          return { width, height, documentWidth: m.documentWidth, searchAndEmptyResult: true, data: fixture.id };
        });
        await test(`CATALOG-DETAIL-ENROLL-NAV-${width}`, async () => {
          if (width >= 1024) await clickVisible(`[...document.querySelectorAll('button[data-admin-list-card]')].filter(${visible}).find(el=>el.textContent.includes(${JSON.stringify(fixture.name)}))`);
          await clickVisible(`[...document.querySelectorAll('a[href="/citizen/activities/${fixture.id}"]')].find(${visible})`); await idle();
          await until(`location.pathname==='/citizen/activities/${fixture.id}'&&document.body&&document.body.innerText.includes(${JSON.stringify(fixture.name)})`, "real detail loaded");
          await until(width < 1024 ? `[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.textContent.includes('Elegir horarios'))` : `[...document.querySelectorAll('[role="checkbox"]')].some(${visible})`, "detail controls rendered");
          assert.ok(!(await metrics()).text.includes("No pudimos cargar")); await capture(`detail-${width}`);
          if (width < 1024) {
            await clickVisible(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.textContent.includes('Elegir horarios'))`); await pause(400);
            await clickVisible(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>!el.disabled&&el.textContent.includes('21:00 a 22:00'))`);
          } else await clickVisible(`[...document.querySelectorAll('[role="checkbox"]')].find(${visible})`);
          await idle();
          await until(`[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.textContent.includes('Continuar inscripci')&&!el.disabled)`, "valid schedule selected");
          await clickVisible(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.textContent.includes('Continuar inscripci')&&!el.disabled)`); await idle();
          await until(`location.pathname==='/citizen/activities/${fixture.id}/enroll'`, "enrollment confirmation route");
          const m = await metrics(); assert.ok(m.documentWidth <= width + 1); await capture(`enrollment-${width}`);
          return { width, height, navigatedToRealEnrollmentConfirmation: true, finalEnrollmentNotSubmitted: true };
        });
      }
      continue;
    }
    if (extra) {
      if (role === "reception") for (const [width, height] of sizes.slice(0, 4)) {
        await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
        await test(`UI-DOC-SELECTED-${width}`, async () => {
          await navigate("/reception/documents/new");
          await until("document.querySelector('input[aria-label=\"Buscar persona\"]')", "document search");
          await fill('input[aria-label="Buscar persona"]', "QA_TEST_citizen"); await pause(600); await idle();
          await until(`[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.textContent.includes('QA_TEST')&&el.textContent.includes('citizen'))`, "document citizen result");
          await evaluate(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.textContent.includes('QA_TEST')&&el.textContent.includes('citizen')).click()`); await idle();
          await until("document.body.innerText.includes('Seleccionar archivo')", "selected citizen document form");
          const m = await metrics(); assert.ok(m.documentWidth <= width + 1); assert.ok(await evaluate("[...document.images].some(img=>img.naturalWidth>0)"));
          const controls = await evaluate(`[...document.querySelectorAll('button')].filter(${visible}).filter(el=>/Seleccionar archivo|Subir|Cargar|Enviar/.test(el.textContent)).map(el=>({text:el.textContent.trim(),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}))`);
          assert.ok(controls.some(c=>c.text.includes('Seleccionar archivo')));
          await capture(`document-selected-${width}`); return { width, height, documentWidth: m.documentWidth, controls };
        });
        await test(`UI-RECEPTION-ACCESS-REQUEST-${width}`, async () => { await navigate("/reception/request-access"); const m = await metrics(); assert.ok(m.documentWidth <= width + 1); assert.ok(m.text.includes("Solicitar acceso")); await capture(`reception-request-access-${width}`); return { width, height, documentWidth: m.documentWidth }; });
      }
      if (role === "citizen") await test("UI-NETWORK-LOSS-AND-RECOVERY", async () => {
        await send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
        await send("Page.navigate", { url: origin + "/citizen/activities" }); await pause(2000);
        const offline = await evaluate("document.body.innerText");
        await send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
        await navigate("/citizen/activities"); const m = await metrics(); assert.ok(!/No pudimos cargar|Application error/.test(m.text)); assert.ok(m.text.length > 40);
        await capture("citizen-network-recovered"); return { offlineErrorVisible: /ERR_INTERNET_DISCONNECTED|sin conexi|No se puede acceder|No internet/i.test(offline), recovered: true, limitation: "Browser offline navigation and recovery; no interrupted mutation claimed." };
      });
      continue;
    }
    if (stage3) {
      const pendingRoutes = role === "admin" ? ["/facilities", "/teachers", "/activities", "/activity-schedules", "/enrollments", "/attendance", "/users?estado=PENDIENTE", "/user-documents"] : role === "teacher" ? ["/teacher/classes", "/teacher/attendance", "/teacher/enrollees", "/teacher/schedules"] : role === "reception" ? ["/reception/documents/new", "/reception/citizens", "/reception/history"] : ["/citizen/activities", "/citizen/enrollments", "/citizen/documents"];
      const viewports = ["admin", "teacher"].includes(role) ? sizes.slice(4) : sizes.slice(0, 4);
      for (const [width, height] of viewports) for (const route of pendingRoutes) await test(`UI-STAGE3-${role}-${route}-${width}`, async () => {
        await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
        const start = requests.length; await navigate(route); const m = await metrics();
        assert.ok(!/No pudimos cargar|Application error|Cargando informaci.n/.test(m.text), m.text);
        assert.ok(m.text.trim().length > 40, "Empty page");
        assert.ok(m.documentWidth <= width + 1, `Horizontal overflow ${m.documentWidth}/${width}`);
        assert.ok(!requests.slice(start).some(r => r.status >= 500), "Real API returned 500");
        await capture(`stage3-${role}-${route.replaceAll('/', '-').replaceAll('?', '-').replaceAll('=', '-')}-${width}`);
        return { width, height, documentWidth: m.documentWidth, path: await evaluate("location.pathname"), requests: requests.slice(start) };
      });
      await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      if (["admin", "teacher"].includes(role)) continue;
    }
    const routes = role === "admin" ? ["/activities", "/users", "/facilities", "/teachers", "/roles", "/enrollments", "/activity-sessions", "/attendance", "/requirements", "/user-documents", "/resources", "/reports"] : role === "teacher" ? ["/teacher/classes", "/teacher/enrollees", "/teacher/schedules", "/teacher/notifications"] : role === "reception" ? ["/reception/manual", "/reception/history", "/reception/citizens", "/reception/enrollments", "/reception/documents/new"] : ["/citizen/activities", "/citizen/enrollments", "/citizen/schedule", "/citizen/qr", "/citizen/documents", "/citizen/profile"];
    for (const route of (focused || stage3 ? [] : routes)) await test(`UI-NAV-${route}`, async () => { const start = requests.length; await navigate(route); const m = await metrics(); assert.equal(await evaluate("location.pathname"), route); assert.ok(!m.text.includes("No pudimos cargar"), m.text); assert.ok(!m.text.includes("Application error"), m.text); assert.ok(!m.text.includes("Cargando información"), "Page remained in initial loading state"); assert.ok(m.text.trim().length > 40, "Empty page"); assert.ok(!requests.slice(start).some(r => r.status >= 500), "A real API returned 500"); await capture(`${route.replaceAll("/", "-").slice(1)}-1440`); return { path: await evaluate("location.pathname"), requests: requests.slice(start), width: m.width, documentWidth: m.documentWidth }; });
    if (!["reception", "citizen"].includes(role)) continue;
    for (const [width, height] of (actionsOnly ? [] : sizes)) await test(`UI-RESPONSIVE-${role}-${width}`, async () => {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
      await navigate(role === "reception" ? "/reception/manual" : "/citizen/schedule");
      if (role === "reception") {
        const selector = "input[placeholder*='Buscar por DNI']";
        await until(`!![...document.querySelectorAll(${JSON.stringify(selector)})].find(${visible})`, "manual search");
        const input = await evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].findIndex(${visible})`);
        await evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})][${input}].id='qa-visible-search'`);
        await fill("#qa-visible-search", focused ? "QA_TEST_citizen" : "QA_TEST"); await pause(600); await idle();
        await until(`!![...document.querySelectorAll('[data-access-person-card]')].find(${visible})`, "real manual search results");
        if (focused) {
          await until(`!![...document.querySelectorAll('[data-access-person-card] img')].filter(${visible}).find(img=>img.naturalWidth&&img.src.includes('useradmin1.png'))`, "real citizen photo");
          if (width < 768) {
            await evaluate(`(()=>{[...document.querySelectorAll('[data-access-person-card]')].find(${visible}).closest('button').click();})()`);
            await idle();
            assert.equal(await evaluate(`[...document.querySelectorAll('button')].filter(${visible}).filter(el=>/Permitir ingreso|Rechazar ingreso/.test(el.textContent)).length`), 2);
          }
        }
      } else if (focused) {
        await until(`!![...document.querySelectorAll('button[aria-label="Mes siguiente"]')].find(${visible})`, "calendar controls");
        await evaluate(`[...document.querySelectorAll('button[aria-label="Mes siguiente"]')].find(${visible}).click()`);
        await pause(700); await idle();
        if (width < 768) {
          await until(`!![...document.querySelectorAll('[aria-label="Tiene actividades"]')].find(${visible})`, "future class day");
          await evaluate(`[...document.querySelectorAll('[aria-label="Tiene actividades"]')].find(${visible}).closest('button').click()`);
        }
        await until(`document.body.innerText.includes('QA_TEST_')`, "populated future calendar");
      }
      const m = await metrics(); assert.ok(m.documentWidth <= width + 1, `Horizontal overflow ${m.documentWidth}/${width}`);
      assert.ok(m.cards.every(card => !card.overflow), "A citizen card overflows");
      await capture(`${role}-${width}x${height}`); return m;
    });
    if (role === "reception" && !actionsOnly) await test("UI-MANUAL-STALE-SEARCH", async () => {
      await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await navigate("/reception/manual");
      await evaluate(`(()=>{[...document.querySelectorAll('input')].find(el=>el.placeholder.includes('Buscar por DNI')&&el.getBoundingClientRect().width>0).id='qa-search-race';})()`);
      await send("Network.emulateNetworkConditions", { offline: false, latency: 1500, downloadThroughput: 1000000, uploadThroughput: 1000000 });
      await fill("#qa-search-race", "QA_TEST"); await pause(550);
      await fill("#qa-search-race", "x"); await pause(4000); await idle();
      const cards = await evaluate(`[...document.querySelectorAll('[data-access-person-card]')].filter(${visible}).length`);
      await capture("manual-stale-search");
      await send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      assert.equal(cards, 0, "Stale results reappeared after shortening the query to one character.");
      return "In-flight real responses do not restore stale citizens.";
    });
    if (role === "reception" && actionsOnly) for (const [width, decision, label] of [[320, "ALLOW", "Permitir ingreso"], [375, "REJECT", "Rechazar ingreso"]]) await test(`UI-MANUAL-REAL-${decision}-${width}`, async () => {
      await send("Emulation.setDeviceMetricsOverride", { width, height: 812, deviceScaleFactor: 1, mobile: true });
      await navigate("/reception/manual");
      await until(`!![...document.querySelectorAll('input')].filter(${visible}).find(el=>el.placeholder.includes('Buscar por DNI'))`, "manual search");
      await evaluate(`[...document.querySelectorAll('input')].filter(${visible}).find(el=>el.placeholder.includes('Buscar por DNI')).id='qa-action-search'`);
      await fill("#qa-action-search", "QA_TEST_citizen"); await pause(600); await idle();
      await until(`!![...document.querySelectorAll('[data-access-person-card]')].find(${visible})`, "action citizen result");
      await evaluate(`[...document.querySelectorAll('[data-access-person-card]')].find(${visible}).closest('button').click()`);
      await evaluate(`[...document.querySelectorAll('textarea')].find(${visible}).id='qa-action-observation'`);
      await fill("#qa-action-observation", `QA_TEST real browser ${decision}`);
      const expression = `[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.textContent.trim()===${JSON.stringify(label)})`;
      await until(`!(${expression}).disabled`, "manual action enabled");
      const box = await evaluate(`(()=>{const button=${expression};button.scrollIntoView({block:'center'});const r=button.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,viewport:innerHeight};})()`);
      assert.ok(box.width > 80 && box.height >= 44 && box.y >= 0 && box.y + box.height <= box.viewport);
      await capture(`manual-${decision}-controls-${width}`);
      const requestStart = requests.length;
      await evaluate(`(${expression}).click()`); await idle();
      await until(`document.body.innerText.includes(${JSON.stringify(decision === "ALLOW" ? "Ingreso autorizado manualmente" : "Ingreso rechazado manualmente")})`, "manual persisted result");
      assert.ok(requests.slice(requestStart).some(r=>r.path==='/api/access/manual/register'&&r.status===201));
      await capture(`manual-${decision}-result-${width}`);
      return { width, decision, button: box, realEndpointStatus: 201 };
    });
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  }
} finally { socket.close(); }
