import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { realQaClient } from "./qa-real-client.mjs";

const stage3 = process.env.QA_BROWSER_STAGE3 === "1";
const catalog = true;
const extra = process.env.QA_BROWSER_EXTRA === "1";
const guard = await realQaClient(); 
const origin = "http://localhost:3000", output = "audit-evidence/qr-manual-decision/browser";
const focused = process.env.QA_BROWSER_FOCUSED === "1";
const actionsOnly = process.env.QA_BROWSER_ACTIONS === "1";
const resultsFile = `${output}/${process.env.QA_QR_BROWSER_REPORT ?? (process.env.QA_QR_MANUAL_ONLY ? "manual-results" : "results")}.json`;
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
  await send("Page.enable"); await send("Page.setLifecycleEventsEnabled",{enabled:true}); await send("Runtime.enable"); await send("Network.enable");
  await send("Emulation.setFocusEmulationEnabled",{enabled:true}); await send("Network.setCacheDisabled",{cacheDisabled:true});
  const fixture=JSON.parse(await fs.readFile(".tmp/qa-postgres/qr-decision.private.json","utf8"));
  const userId=process.env.QA_QR_BROWSER_OTHER_DAY?fixture.fixtures.users.find(u=>u.label==="other_day").id:fixture.fixtures.browserUserId;
  await send("Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await login("reception");
  const snapshot=()=>guard.db.asistencia.findMany({orderBy:{id:"asc"}});
  if(!process.env.QA_QR_MANUAL_ONLY)for(const [width,height]of[[320,700],[375,812],[390,844],[430,932],[1440,900]])await test(`REAL-CAMERA-QR-DECISION-${width}`,async()=>{
    await send("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<768});
    const before=await snapshot(),beforeAccess=await guard.db.registroAcceso.count({where:{usuarioId:userId}}),startRequests=requests.length;
    await navigate("/reception/scan");
    await until(`[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.textContent.trim().startsWith('Iniciar'))`,"camera start button");
    await clickVisible(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.textContent.trim().startsWith('Iniciar'))`);
    await until(`[...document.querySelectorAll('[data-qr-manual-decision]')].some(${visible})`,"real QR decoded from fake video device");
    assert.equal(await guard.db.registroAcceso.count({where:{usuarioId:userId}}),beforeAccess,"Scan prematurely saved a final rejection");
    assert.ok(!await evaluate("document.body.innerText.includes('Acceso rechazado')"));
    const m=await metrics();assert.ok(m.documentWidth<=width+1,`Overflow ${m.documentWidth}/${width}`);
    assert.ok(m.cards.some(c=>c.photoLoaded),"Citizen photograph not loaded");assert.ok(m.cards.every(c=>!c.overflow));
    const controls=`[...document.querySelectorAll('[data-qr-manual-decision]')].find(${visible})`;
    assert.equal(await evaluate(`(${controls}).querySelectorAll('button:disabled').length`),2);
    await evaluate(`(${controls}).querySelector('textarea').id='qa-observation'`);
    await fill("#qa-observation","1234");assert.equal(await evaluate(`(${controls}).querySelectorAll('button:disabled').length`),2);
    const observation=`QA_TEST Browser ${width}: ingreso excepcional sin asistencia`,allow=[320,390,1440].includes(width),label=allow?"Permitir ingreso":"Rechazar ingreso";
    await fill("#qa-observation",observation);
    await until(`(${controls}).querySelectorAll('button:disabled').length===0`,"mandatory observation validated");
    await capture(`pending-${width}`);
    const button=`[...(${controls}).querySelectorAll('button')].find(el=>el.textContent.includes(${JSON.stringify(label)}))`;
    if(width===1440){
      await evaluate(`(${button}).scrollIntoView({block:'center',behavior:'instant'})`);await pause(150);
      const point=await evaluate(`(()=>{const r=(${button}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
      for(let i=0;i<2;i++){await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',buttons:0,clickCount:1});}
    }else await clickVisible(button);
    await until(`document.body.innerText.includes(${JSON.stringify(allow?"Acceso permitido":"Acceso rechazado")})`,"final real access decision");await idle();
    const rows=await guard.db.registroAcceso.findMany({where:{usuarioId:userId},orderBy:{fechaHora:"desc"}}),after=await snapshot();
    assert.equal(rows.length,beforeAccess+1);assert.equal(rows[0].observaciones,observation);assert.equal(rows[0].resultado,allow?"PERMITIDO":"RECHAZADO");
    assert.equal(rows[0].registradoPorId,guard.users.reception.id);assert.deepEqual(after,before,"QR manual UI changed attendance");
    assert.ok((await metrics()).documentWidth<=width+1);await capture(`result-${width}`);
    const calls=requests.slice(startRequests);assert.equal(calls.filter(r=>r.path==='/api/access/manual/register').length,1,"Double click submitted multiple decisions");
    await fs.writeFile(`${output}/attendance-${width}.json`,JSON.stringify({before,after,unchanged:true},null,2));
    return{width,height,decodedByRealScanner:true,cameraSource:"Local Y4M fake device containing a real valid QR; no API interception",result:rows[0].resultado,accessId:rows[0].id,attendanceUnchanged:true,documentWidth:m.documentWidth,doubleClick:width===1440,otherDayAtSameTime:!!process.env.QA_QR_BROWSER_OTHER_DAY};
  });
  if(process.env.QA_QR_MANUAL_ONLY)for(const [width,height]of[[320,700],[1440,900]])await test(`MANUAL-SEARCH-REGRESSION-${width}`,async()=>{
    const before=await snapshot(),beforeAccess=await guard.db.registroAcceso.count({where:{usuarioId:userId}}),person=await guard.db.usuario.findUniqueOrThrow({where:{id:userId}});
    await send("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<768});await navigate("/reception/manual");
    await until(`[...document.querySelectorAll('input')].filter(${visible}).some(el=>el.placeholder.includes('Buscar por DNI'))`,"manual search input");
    await evaluate(`[...document.querySelectorAll('input')].filter(${visible}).find(el=>el.placeholder.includes('Buscar por DNI')).id='qa-manual-query'`);await fill('#qa-manual-query',person.email);
    await until(`[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.querySelector('[data-access-person-card]')&&el.textContent.includes('no_enrollment'))`,"manual real citizen result");
    await clickVisible(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.querySelector('[data-access-person-card]')&&el.textContent.includes('no_enrollment'))`);
    await until(`[...document.querySelectorAll('textarea')].some(${visible})`,"shared manual decision controls");
    await evaluate(`[...document.querySelectorAll('textarea')].find(${visible}).id='qa-manual-observation'`);
    await fill('#qa-manual-observation',`QA_TEST manual regression ${width}`);
    const m=await metrics();assert.ok(m.documentWidth<=width+1);assert.ok(m.cards.some(c=>c.photoLoaded));await capture(`manual-pending-${width}`);
    await clickVisible(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.textContent.includes('Rechazar ingreso')&&!el.disabled)`);
    await until("document.body.innerText.includes('Acceso rechazado')","manual original rejection");await idle();
    const rows=await guard.db.registroAcceso.findMany({where:{usuarioId:userId},orderBy:{fechaHora:'desc'}});assert.equal(rows.length,beforeAccess+1);assert.equal(rows[0].origen,'MANUAL');assert.equal(rows[0].observaciones,`QA_TEST manual regression ${width}`);assert.deepEqual(await snapshot(),before);
    assert.ok((await metrics()).documentWidth<=width+1);await capture(`manual-result-${width}`);return{width,height,accessId:rows[0].id,originalManualEndpoint:true,photoVisible:true,attendanceUnchanged:true};
  });
  assert.ok(results.every(r=>r.status==='PASS'),"Real browser QA failed; inspect evidence");
}finally{await guard.db.$disconnect();socket.close();}
