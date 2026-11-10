import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { realQaClient } from "./qa-real-client.mjs";

const stage3 = process.env.QA_BROWSER_STAGE3 === "1";
const catalog = true;
const extra = process.env.QA_BROWSER_EXTRA === "1";
const guard = await realQaClient(); 
const origin="http://localhost:3000",output="audit-evidence/manual-search-notice/browser";
const focused = process.env.QA_BROWSER_FOCUSED === "1";
const actionsOnly = process.env.QA_BROWSER_ACTIONS === "1";
const resultsFile = `${output}/${extra ? "extra-results" : actionsOnly ? "actions-results" : focused ? "focused-results" : "results"}.json`;
await fs.mkdir(output, { recursive: true });
const accounts = JSON.parse(await fs.readFile(".tmp/qa-postgres/accounts.private.json", "utf8"));
const fixture=JSON.parse(await fs.readFile('.tmp/qa-postgres/qr-decision.private.json','utf8'));
const venueName=(await guard.db.establecimiento.findUniqueOrThrow({where:{id:fixture.fixtures.venueId}})).nombre;
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
  if (msg.method === "Page.lifecycleEvent" && msg.params.name === "DOMContentLoaded") loadedDocuments.add(msg.params.loaderId);
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
  await until(`[...document.querySelectorAll('article')].filter(${visible}).some(el=>el.textContent.includes(${JSON.stringify(venueName)}))`, "real venue selection");
  await evaluate(`[...document.querySelectorAll('article')].filter(${visible}).find(el=>el.textContent.includes(${JSON.stringify(venueName)})).querySelector('button').click()`);
  await until("!location.pathname.startsWith('/select-venue')", "venue selected"); await idle();
}
async function navigate(route) {
  if (catalog) inflight.clear();
  const navigation = await send("Page.navigate", { url: origin + route });
  if (catalog && navigation.loaderId) {
    const deadline = Date.now() + 90000;
    while (!loadedDocuments.has(navigation.loaderId)) { if (Date.now() > deadline) throw new Error(`Document load timed out: ${route}`); await pause(100); }
  }
  await until(`document.readyState!=='loading'&&location.pathname===${JSON.stringify(route.split('?')[0])}`, route); await idle(); await pause(1200); if (route.startsWith('/reception')) await selectVenue();
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
try{
  await send('Page.enable');await send('Page.setLifecycleEventsEnabled',{enabled:true});await send('Runtime.enable');await send('Network.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await login('reception');
  const target=fixture.fixtures.users.find(u=>u.label==='off_hours'),person=await guard.db.usuario.findUniqueOrThrow({where:{id:target.id}}),blocked=await guard.db.usuario.findUniqueOrThrow({where:{id:fixture.fixtures.users.find(u=>u.label==='inactive').id}});
  const search=async p=>(await guard.call(`/api/access/manual/search?establishmentId=${fixture.fixtures.venueId}&q=${encodeURIComponent(p.email)}`,{role:'reception'})).data.find(u=>u.id===p.id);
  const evaluated=await search(person);assert.equal(evaluated.validation.reason,'FUERA_DE_HORARIO','QA fixture must actually be out of hours');
  const snapshot=()=>guard.db.asistencia.findMany({orderBy:{id:'asc'}});
  async function selectPerson(p){
    await navigate('/reception/manual');await until(`[...document.querySelectorAll('input')].filter(${visible}).some(el=>el.placeholder.includes('Buscar por DNI'))`,'manual search');
    await evaluate(`[...document.querySelectorAll('input')].filter(${visible}).find(el=>el.placeholder.includes('Buscar por DNI')).id='qa-search'`);await until("Object.keys(document.querySelector('#qa-search')).some(key=>key.startsWith('__reactProps'))",'hydrated search input');await fill('#qa-search',p.email);
    await until(`[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.querySelector('[data-access-person-card]')&&el.textContent.includes(${JSON.stringify(p.apellido)}))`,'real citizen result');
    await clickVisible(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.querySelector('[data-access-person-card]')&&el.textContent.includes(${JSON.stringify(p.apellido)}))`);
    await until(`[...document.querySelectorAll('textarea')].some(${visible})`,'manual decision form');
    await evaluate(`[...document.querySelectorAll('textarea')].find(${visible}).id='qa-observation'`);
  }
  for(const [width,height]of[[320,700],[375,812],[390,844],[430,932]])for(const decision of['ALLOW','REJECT'])await test(`MANUAL-${width}-${decision}`,async()=>{
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    const before=await snapshot(),count=await guard.db.registroAcceso.count({where:{usuarioId:person.id}});await selectPerson(person);
    assert.ok(!await evaluate("document.body.innerText.includes('Validación actual')"));assert.ok(!await evaluate(`document.body.innerText.includes(${JSON.stringify(evaluated.validation.message)})`));
    const m=await metrics();assert.ok(m.documentWidth<=width+1);assert.ok(m.cards.some(c=>c.photoLoaded));await capture(`identity-${width}-${decision}`);
    const actions=`[...document.querySelectorAll('button')].filter(${visible}).filter(el=>el.textContent.includes('Permitir ingreso')||el.textContent.includes('Rechazar ingreso'))`;
    assert.equal(await evaluate(`(${actions}).filter(el=>el.disabled).length`),2);
    await fill('#qa-observation','1234');assert.equal(await evaluate(`(${actions}).filter(el=>el.disabled).length`),2);
    const observation=`QA_TEST aviso manual ${width} ${decision}`;await fill('#qa-observation',observation);await until(`(${actions}).every(el=>!el.disabled)`,'existing observation validation');await capture(`controls-${width}-${decision}`);
    const label=decision==='ALLOW'?'Permitir ingreso':'Rechazar ingreso';await clickVisible(`(${actions}).find(el=>el.textContent.includes(${JSON.stringify(label)}))`);
    await until(`document.body.innerText.includes(${JSON.stringify(decision==='ALLOW'?'Acceso permitido':'Acceso rechazado')})`,'persisted manual decision');await idle();
    const rows=await guard.db.registroAcceso.findMany({where:{usuarioId:person.id},orderBy:{fechaHora:'desc'}}),after=await snapshot();assert.equal(rows.length,count+1);assert.equal(rows[0].observaciones,observation);assert.equal(rows[0].resultado,decision==='ALLOW'?'PERMITIDO':'RECHAZADO');assert.equal(rows[0].origen,'MANUAL');assert.equal(rows[0].registradoPorId,guard.users.reception.id);assert.deepEqual(after,before);
    await fs.writeFile(`${output}/attendance-${width}-${decision}.json`,JSON.stringify({before,after,unchanged:true},null,2));assert.ok((await metrics()).documentWidth<=width+1);await capture(`result-${width}-${decision}`);
    return{width,height,decision,accessId:rows[0].id,originalReason:evaluated.validation.reason,noticeHidden:true,photoVisible:true,observationValidation:true,attendanceUnchangedForExistingFixture:true};
  });
  await test('BLOCKING-STATE-NOTICE-RETAINED',async()=>{
    await send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});const value=await search(blocked);assert.equal(value.validation.reason,'USUARIO_INACTIVO');await selectPerson(blocked);
    assert.ok(await evaluate("document.body.innerText.includes('Validación actual')"));assert.ok(await evaluate(`document.body.innerText.includes(${JSON.stringify(value.validation.message)})`));await capture('blocking-state-retained');return{reason:value.validation.reason,messageVisible:true};
  });
  await test('REAL-SEARCH-NETWORK-ERROR-REMAINS-VISIBLE',async()=>{
    await navigate('/reception/manual');await until(`[...document.querySelectorAll('input')].filter(${visible}).some(el=>el.placeholder.includes('Buscar por DNI'))`,'search controls');await evaluate(`[...document.querySelectorAll('input')].filter(${visible}).find(el=>el.placeholder.includes('Buscar por DNI')).id='qa-network-search'`);
    try{await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await fill('#qa-network-search',person.email);await until("document.body.innerText.includes('No pudimos buscar personas')",'existing blocking error toast');await capture('network-error-visible');}
    finally{await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});}
    await selectPerson(person);return{realNetworkFailure:true,errorVisible:true,recovered:true,apiInterception:false};
  });
  await test('DESKTOP-PRESENTATION-UNCHANGED',async()=>{
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await selectPerson(person);assert.ok(await evaluate("document.body.innerText.includes('Validación actual:')"));assert.ok(await evaluate(`document.body.innerText.includes(${JSON.stringify(evaluated.validation.message)})`));assert.ok((await metrics()).documentWidth<=1441);await capture('desktop-unchanged');return{width:1440,height:900,desktopValidationTextUnchanged:true};
  });
  await test('AUTHORIZATION-AND-OBSERVATION-BACKEND-UNCHANGED',async()=>{
    for(const role of['teacher','citizen'])await guard.call(`/api/access/manual/search?establishmentId=${fixture.fixtures.venueId}&q=${encodeURIComponent(person.email)}`,{role,status:403});
    const anonymous=await fetch(origin+`/api/access/manual/search?establishmentId=${fixture.fixtures.venueId}&q=${encodeURIComponent(person.email)}`);assert.equal(anonymous.status,401);
    for(const decision of['ALLOW','REJECT'])await guard.call('/api/access/manual/register',{role:'reception',method:'POST',status:400,body:{establishmentId:fixture.fixtures.venueId,userId:person.id,decision,observation:'1234'}});
    return{anonymous:401,unauthorizedRoles:403,bothShortObservations:400};
  });
  await test('QR-OUT-OF-HOURS-NOTICE-UNCHANGED',async()=>{
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await navigate('/reception/scan');await until(`[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.textContent.trim().startsWith('Iniciar'))`,'QR scanner');await clickVisible(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.textContent.trim().startsWith('Iniciar'))`);
    await until(`[...document.querySelectorAll('[data-qr-manual-decision]')].some(${visible})`,'actual QR from fake camera');assert.ok(await evaluate(`document.body.innerText.includes(${JSON.stringify(evaluated.validation.message)})`));assert.ok(await evaluate("document.body.innerText.includes('Decisión manual requerida')"));await capture('qr-notice-unchanged');return{realScanner:true,originalReasonVisible:true,qrComponentsUnchanged:true};
  });
  assert.ok(results.every(r=>r.status==='PASS'),'Manual notice QA failed; inspect evidence');
}finally{await guard.db.$disconnect();socket.close();}
