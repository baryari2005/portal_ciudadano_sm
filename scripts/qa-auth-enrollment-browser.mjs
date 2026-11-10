import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { realQaClient } from "./qa-real-client.mjs";

const stage3 = process.env.QA_BROWSER_STAGE3 === "1";
const catalog = true;
const extra = process.env.QA_BROWSER_EXTRA === "1";
const guard = await realQaClient(); 
const phase=process.argv[2]; if(!["before","after"].includes(phase)) throw Error("phase");
const origin = "http://localhost:3000", output = true ? `audit-evidence/auth-persistence/enrollment-browser-${phase}` : catalog ? "audit-evidence/citizen-catalog/browser" : stage3 ? "audit-evidence/qa-stage3/browser" : "audit-evidence/qa-stage2/browser";
const focused = process.env.QA_BROWSER_FOCUSED === "1";
const actionsOnly = process.env.QA_BROWSER_ACTIONS === "1";
const resultsFile = `${output}/${extra ? "extra-results" : actionsOnly ? "actions-results" : focused ? "focused-results" : "results"}.json`;
await fs.mkdir(output, { recursive: true });
const accounts = JSON.parse(await fs.readFile(".tmp/qa-postgres/accounts.private.json", "utf8"));
const tabs = await (await fetch("http://127.0.0.1:9225/json/list")).json();
const socket = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let seq = 0; const pending = new Map(), inflight = new Set(), loadedDocuments = new Set(), requests = [], requestStarts = new Map(), exceptions = [], results = [];
function send(method, params = {}) { const id = ++seq; return new Promise((resolve, reject) => { const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout ${method}`)); }, 120000); pending.set(id, { resolve, reject, timeout }); socket.send(JSON.stringify({ id, method, params })); }); }
socket.onmessage = event => {
  const msg = JSON.parse(event.data);
  if (msg.id) { const p = pending.get(msg.id); if (!p) return; clearTimeout(p.timeout); pending.delete(msg.id); msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result); return; }
  if (msg.method === "Network.requestWillBeSent" && msg.params.request.url.startsWith(origin + "/api/") && !/\/api\/(server-time|citizen\/notifications)/.test(msg.params.request.url)) { inflight.add(msg.params.requestId); requestStarts.set(msg.params.requestId,{at:performance.now(),path:new URL(msg.params.request.url).pathname,method:msg.params.request.method}); }
  if (["Network.loadingFinished", "Network.loadingFailed"].includes(msg.method)) { inflight.delete(msg.params.requestId); const r=requestStarts.get(msg.params.requestId); if(r) {r.ms=performance.now()-r.at; requests.push(r);requestStarts.delete(msg.params.requestId);} }
  if (msg.method === "Network.responseReceived" && msg.params.response.url.startsWith(origin + "/api/")) requests.push({ path: new URL(msg.params.response.url).pathname, status: msg.params.response.status });
  if (msg.method === "Page.lifecycleEvent" && msg.params.name === "DOMContentLoaded") loadedDocuments.add(msg.params.loaderId);
  if (msg.method === "Runtime.exceptionThrown") exceptions.push({ text: msg.params.exceptionDetails.text, url: msg.params.exceptionDetails.url, line: msg.params.exceptionDetails.lineNumber, description: msg.params.exceptionDetails.exception?.description });
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function evaluate(expression) { const r = await send("Runtime.evaluate", { expression, awaitPromise: expression.includes("fetch(") || expression.startsWith("(async"), returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; }
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
  await until(`document.readyState!=='loading'&&location.pathname===${JSON.stringify(route.split('?')[0])}`, route); await idle(); await pause(1200); if (route.startsWith('/reception')) await selectVenue();
}
async function capture(name) { const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await fs.writeFile(`${output}/${name}.png`, Buffer.from(r.data, "base64")); }
async function test(id, work) { try { results.push({ id, status: "PASS", detail: await work() }); } catch (e) { let context; if (catalog) { try { context = await evaluate("({path:location.pathname,text:document.body?.innerText.slice(0,1000)})"); } catch {} } results.push({ id, status: "FAIL", detail: e.message, context }); } await fs.writeFile(resultsFile, JSON.stringify({ origin, apiInterception: false, results, requests, exceptions }, null, 2)); console.log(`${id}: ${results.at(-1).status}`); }
async function login(role) {
  await send("Page.navigate",{url:"about:blank"});await pause(400);
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
const sizes = [[320, 700], [375, 812], [390, 844], [430, 932], [1440, 900]];
async function metrics() { return evaluate(`({width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,text:document.body.innerText.slice(0,1400),cards:[...document.querySelectorAll('[data-access-person-card]')].filter(${visible}).map(card=>{const a=card.querySelector('[data-slot=avatar]');const img=a?.querySelector('img');return{width:card.getBoundingClientRect().width,overflow:card.scrollWidth>card.clientWidth+1,avatarWidth:a?.getBoundingClientRect().width,photo:img?.getAttribute('src'),photoLoaded:!!img?.naturalWidth}})})`); }
try {
  await send("Page.enable"); await send("Page.setLifecycleEventsEnabled", {enabled:true});
  await send("Runtime.enable"); await send("Network.enable");
  await send("Emulation.setFocusEmulationEnabled", {enabled:true});
  await send("Network.setCacheDisabled", {cacheDisabled:true});
  const fixture = JSON.parse(await fs.readFile(`.tmp/qa-postgres/performance-${phase}.private.json`,"utf8"));
  const adminAccount=accounts.find(a=>a.role==='admin');
  const admin=await guard.db.usuario.findUniqueOrThrow({where:{userId:adminAccount.userId}});
  const role=await guard.db.rol.findUniqueOrThrow({where:{codigo:'citizen'}});
  for(const [width,height] of sizes.filter(([w])=>!process.env.QA_ENROLLMENT_WIDTHS||process.env.QA_ENROLLMENT_WIDTHS.split(",").includes(String(w)))) {
    const userId=`QA_TEST_PERF_UI_${phase}_${width}_${Date.now()}`;
    const user=await guard.db.usuario.create({data:{userId,email:`${userId.toLowerCase()}@example.invalid`,password:admin.password,rolId:role.id,nombre:'QA_TEST',apellido:`Performance UI ${width}`,fechaNacimiento:new Date('1990-01-01'),perfilCompleto:true}});
    accounts.splice(accounts.findIndex(a=>a.role==='citizen'),1,{role:'citizen',userId,password:adminAccount.password});
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
    await test(`FLOW-${width}`,async()=>{
      await login('citizen'); await navigate('/citizen/activities');
      const name=JSON.stringify(fixture.marker);
      await until(`[...document.querySelectorAll('input')].filter(${visible}).some(el=>el.placeholder.includes('Buscar'))`,'catalog search');
      await evaluate(`[...document.querySelectorAll('input')].filter(${visible}).find(el=>el.placeholder.includes('Buscar')).id='qa-search'`);
      await fill('#qa-search',fixture.marker); await pause(400);
      if(width>=1024) await clickVisible(`[...document.querySelectorAll('button[data-admin-list-card]')].filter(${visible}).find(el=>el.textContent.includes(${name}))`);
      const stages=[];
      async function timed(stage,target,ready) {
        const start=performance.now(), offset=requests.length;
        await clickVisible(target); await until(ready,stage);
        const navigationMs=performance.now()-start;
        await idle(); const m=await metrics(); assert.ok(m.documentWidth<=width+1,`Overflow ${m.documentWidth}/${width}`);
        await capture(`${width}-${stage}`);
        const api=requests.slice(offset).filter(r=>r.ms!==undefined).map(({path,method,ms})=>({path,method,ms}));
        stages.push({stage,navigationMs,api,documentWidth:m.documentWidth,pollResolutionMs:200});
      }
      await timed('detail',`[...document.querySelectorAll('a[href="/citizen/activities/${fixture.activityId}"]')].find(${visible})`,width<1024?`location.pathname==='/citizen/activities/${fixture.activityId}'&&[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.textContent.includes('Elegir horarios'))`:`location.pathname==='/citizen/activities/${fixture.activityId}'&&[...document.querySelectorAll('[role="checkbox"]')].some(${visible})`);
      if(width<1024) {
        await clickVisible(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.textContent.includes('Elegir horarios'))`); await pause(300);
        const choices=await evaluate(`[...document.querySelectorAll('button')].filter(${visible}).filter(el=>!el.disabled&&el.textContent.includes('20:00 a 21:00')).length`);
        assert.ok(choices>0,'No real schedule choices');
        await clickVisible(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>!el.disabled&&el.textContent.includes('20:00 a 21:00'))`);
      } else await clickVisible(`[...document.querySelectorAll('[role="checkbox"]')].find(${visible})`);
      await until(`[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.textContent.includes('Continuar inscripci')&&!el.disabled)`,'selection');
      await timed('confirmation',`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.textContent.includes('Continuar inscripci')&&!el.disabled)`,`location.pathname.endsWith('/enroll')&&[...document.querySelectorAll('[role="checkbox"]')].some(${visible})`);
      for(let i=0;i<3;i++) {const unchecked=await evaluate(`[...document.querySelectorAll('[role="checkbox"]')].filter(${visible}).some(el=>el.getAttribute('aria-checked')==='false')`);if(!unchecked)break;await clickVisible(`[...document.querySelectorAll('[role="checkbox"]')].filter(${visible}).find(el=>el.getAttribute('aria-checked')==='false')`);}
      await until(`[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.textContent.includes('Confirmar inscripci')&&!el.disabled)`,'consents');
      await timed('submit',`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.textContent.includes('Confirmar inscripci')&&!el.disabled)`,`location.pathname==='/citizen/enrollments'&&document.body.innerText.includes(${name})`);
      const saved=await guard.db.inscripcion.findFirst({where:{usuarioId:user.id,horarioActividad:{actividadId:fixture.activityId}}});
      assert.equal(saved?.estado,'CONFIRMADA');
      return {width,height,userId,activityId:fixture.activityId,enrollmentId:saved.id,stages};
    });
  }
  assert.ok(results.every(r=>r.status==='PASS'), 'Flow failures; inspect evidence');
} finally { await guard.db.$disconnect(); socket.close(); }
