import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { realQaClient } from "./qa-real-client.mjs";

const stage3 = process.env.QA_BROWSER_STAGE3 === "1";
const catalog = true;
const extra = process.env.QA_BROWSER_EXTRA === "1";
const guard = await realQaClient(); 
const phase=process.argv[2];if(!["before","after"].includes(phase))throw Error("phase required");
const origin = "http://localhost:3000", output = `audit-evidence/teacher-isolation/browser-${phase}`;
const focused = process.env.QA_BROWSER_FOCUSED === "1";
const actionsOnly = process.env.QA_BROWSER_ACTIONS === "1";
const resultsFile = `${output}/${process.env.QA_LOGOUT_REPORT ?? "results"}.json`;
await fs.mkdir(output, { recursive: true });
const accounts = JSON.parse(await fs.readFile(".tmp/qa-postgres/accounts.private.json", "utf8"));
const tabs = await (await fetch("http://127.0.0.1:9224/json/list")).json();
const socket = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let activeCase="boot",activeStep="boot";
let seq = 0; const pending = new Map(), inflight = new Set(), loadedDocuments = new Set(), requests = [], exceptions = [], results = [];
function send(method, params = {}) { const id = ++seq; return new Promise((resolve, reject) => { const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout ${method}`)); }, 120000); pending.set(id, { resolve, reject, timeout }); socket.send(JSON.stringify({ id, method, params })); }); }
socket.onmessage = event => {
  const msg = JSON.parse(event.data);
  if (msg.id) { const p = pending.get(msg.id); if (!p) return; clearTimeout(p.timeout); pending.delete(msg.id); msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result); return; }
  if (msg.method === "Network.requestWillBeSent" && msg.params.request.url.startsWith(origin + "/api/") && !/\/api\/(server-time|citizen\/notifications)/.test(msg.params.request.url)) inflight.add(msg.params.requestId);
  if (["Network.loadingFinished", "Network.loadingFailed"].includes(msg.method)) inflight.delete(msg.params.requestId);
  if (msg.method === "Network.responseReceived" && msg.params.response.url.startsWith(origin + "/api/")) requests.push({ path: new URL(msg.params.response.url).pathname, status: msg.params.response.status });
  if (msg.method === "Page.lifecycleEvent" && msg.params.name === "DOMContentLoaded") loadedDocuments.add(msg.params.loaderId);
  if (msg.method === "Runtime.exceptionThrown") exceptions.push({ activeCase, activeStep, text: msg.params.exceptionDetails.text, url: msg.params.exceptionDetails.url, line: msg.params.exceptionDetails.lineNumber, description: msg.params.exceptionDetails.exception?.description });
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function evaluate(expression) { const r = await send("Runtime.evaluate", { expression, awaitPromise: expression.includes("fetch(")||expression.startsWith("(async"), returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; }
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
async function test(id, work) { activeCase=id;activeStep="start";try { results.push({ id, status: "PASS", detail: await work() }); } catch (e) { let context; if (catalog) { try { context = await evaluate("({path:location.pathname,text:document.body?.innerText.slice(0,1000)})"); } catch {} } results.push({ id, status: "FAIL", detail: e.message, context }); } await fs.writeFile(resultsFile, JSON.stringify({ origin, apiInterception: false, results, requests, exceptions }, null, 2)); console.log(`${id}: ${results.at(-1).status}`); }
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
const sizes = [[320, 700], [375, 812], [390, 844], [430, 932], [1366, 768], [1440, 900], [1920, 1080]];
async function metrics() { return evaluate(`({width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,text:document.body.innerText.slice(0,1400),cards:[...document.querySelectorAll('[data-access-person-card]')].filter(${visible}).map(card=>{const a=card.querySelector('[data-slot=avatar]');const img=a?.querySelector('img');return{width:card.getBoundingClientRect().width,overflow:card.scrollWidth>card.clientWidth+1,avatarWidth:a?.getBoundingClientRect().width,photo:img?.getAttribute('src'),photoLoaded:!!img?.naturalWidth}})})`); }
const footer=`[...document.querySelectorAll('footer')].filter(${visible}).find(el=>el.textContent.includes('Contraseña')&&el.textContent.includes('Editar perfil'))`;
const geometry=()=>evaluate(`(()=>{const f=${footer};return[...f.querySelectorAll('button')].map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{text:el.textContent.trim(),x:r.x,y:r.y,width:r.width,height:r.height,className:el.className,fontSize:s.fontSize,background:s.backgroundColor,color:s.color}})})()`);
try{
 await send('Page.enable');await send('Page.setLifecycleEventsEnabled',{enabled:true});await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Emulation.setFocusEmulationEnabled',{enabled:true});
 const saved=JSON.parse(await fs.readFile('.tmp/qa-postgres/teacher-isolation.private.json','utf8'));const fixtures={assigned:{...saved.teachers.A,password:saved.password},empty:{...saved.teachers.EMPTY,password:saved.password}};
 for(const scenario of (process.env.QA_TEACHER_SCENARIOS??'assigned,empty').split(',')){
  Object.assign(accounts.find(a=>a.role==='teacher'),fixtures[scenario]);
  for(const [width,height]of (phase==='before'?[[390,844]]:[[320,700],[375,812],[390,844],[430,932],[1440,900]]).filter(([width])=>!process.env.QA_TEACHER_WIDTHS||process.env.QA_TEACHER_WIDTHS.split(',').includes(String(width))))await test(`${scenario}-${width}`,async()=>{
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});await login('teacher');
   await navigate('/teacher');await until("document.body.innerText.toLowerCase().includes('no tenés actividades asignadas')||document.body.innerText.includes('Próxima clase')||document.body.innerText.includes('Dashboard del Profesor')||document.body.innerText.includes('Clases de hoy')",'teacher dashboard or assignment empty state');
   const home=await metrics();assert.ok(home.documentWidth<=width+1);if(scenario==='empty')assert.ok(home.text.includes('no tenés actividades asignadas')||home.text.includes('no tenés actividades asignadas'.replace('no','No')));
   await capture(`${scenario}-${width}-home`);
   if(phase==='after'){
    if(scenario==='assigned'){
     await navigate('/select-venue?workspace=teacher');await selectVenue();await until("location.pathname==='/teacher'",'authorized venue selected');
    }
    for(const section of ['classes','schedules','enrollees','attendance','notifications','help']){
     await navigate(`/teacher/${section}`);await until("!document.body.innerText.includes('Cargando')",`section ${section} loaded`);await idle();
     assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),`Overflow in ${section}`);
     if(scenario==='empty'&&!['notifications','help'].includes(section))assert.ok(await evaluate("document.body.innerText.includes('no tenés actividades asignadas')"),'Missing assignment empty state');
    }
   }
   if(scenario==='empty'){
    await navigate('/select-venue?workspace=teacher');await until("document.body.innerText.includes('No tenés establecimientos asignados')",'no venue authorization');await capture(`${scenario}-${width}-venues`);
   }
   await navigate('/teacher/profile');await until(`!!(${footer})||(document.body.innerText.includes('Mi perfil')&&[...document.querySelectorAll('input')].filter(${visible}).length>2)`,'teacher profile');
   const mobile=width<768;
   let controls,button;
   if(mobile){
    await until(`!!(${footer})`,'profile footer');controls=await geometry();
    if(phase==='after'&&width===390){const baseline=JSON.parse(await fs.readFile('audit-evidence/teacher-access/browser-before/results-final.json','utf8'));assert.deepEqual(controls,baseline.results.find(r=>r.id===`${scenario}-390`).detail.controls,'Existing footer changed');}
    activeStep='password';await clickVisible(`(${footer}).querySelector('button')`);await until("!!document.querySelector('[role=dialog]')",'password dialog');assert.equal(await evaluate("document.querySelectorAll('[role=dialog] input[type=password]').length"),3);
    await evaluate("document.querySelectorAll('[role=dialog] input')[0].id='qa-current';document.querySelectorAll('[role=dialog] input')[1].id='qa-new';document.querySelectorAll('[role=dialog] input')[2].id='qa-confirm'");
    await fill('#qa-current','QA_TEST-unused');await fill('#qa-new','12345');await fill('#qa-confirm','12345');assert.ok(await evaluate("[...document.querySelectorAll('[role=dialog] button')].find(e=>e.textContent.trim()==='Guardar').disabled"));
    await fill('#qa-new','123456');await fill('#qa-confirm','123456');await until("![...document.querySelectorAll('[role=dialog] button')].find(e=>e.textContent.trim()==='Guardar').disabled",'unchanged password validation');
    await capture(`${scenario}-${width}-password`);await clickVisible("[...document.querySelectorAll('[role=dialog] button')].find(e=>e.textContent.trim()==='Cancelar')");await until("!document.querySelector('[role=dialog]')",'cancel password');
    activeStep='edit';await clickVisible(`(${footer}).querySelectorAll('button')[1]`);await until(`[...document.querySelectorAll('button')].filter(${visible}).some(e=>e.textContent.includes('Guardar cambios'))`,'profile editor');await capture(`${scenario}-${width}-edit`);
    await navigate('/teacher/profile');await until(`!!(${footer})`,'return profile');
    const selector='[data-mobile-profile-logout]';await until(`!!document.querySelector('${selector}')`,'existing logout');await evaluate(`document.querySelector('${selector}').scrollIntoView({block:'center',behavior:'instant'})`);await pause(250);
    button=await evaluate(`(()=>{const e=document.querySelector('${selector}'),r=e.getBoundingClientRect(),s=getComputedStyle(e);return{height:r.height,width:r.width,previous:e.previousElementSibling.textContent,footer:!!e.closest('footer'),background:s.backgroundColor,color:s.color,border:s.borderColor,overflow:document.documentElement.scrollWidth>innerWidth+1,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}})()`);
    assert.ok(button.previous.includes('Cobertura médica'));assert.ok(button.height>=44&&button.hit&&!button.footer&&!button.overflow);assert.equal(button.background,'rgb(255, 255, 255)');
    await capture(`${scenario}-${width}-profile`);activeStep='logout';await clickVisible(`document.querySelector('${selector}')`);
   }else{
    assert.equal(await evaluate(`[...document.querySelectorAll('[data-mobile-profile-logout]')].filter(${visible}).length`),0);assert.ok(await evaluate(`[...document.querySelectorAll('input')].filter(${visible}).length>2`));await capture(`${scenario}-${width}-profile`);
    await clickVisible(`[...document.querySelectorAll('button')].filter(${visible}).find(e=>e.textContent.includes('Cambiar contraseña'))`);await until("!!document.querySelector('[role=dialog]')",'desktop password');await clickVisible("[...document.querySelectorAll('[role=dialog] button')].find(e=>e.textContent.trim()==='Cancelar')");await until("!document.querySelector('[role=dialog]')",'desktop password cancelled');
    activeStep='logout';await send('Page.navigate',{url:origin+'/logout'});
   }
   await until("location.pathname==='/login'&&document.readyState!=='loading'",'logout redirect');
   const cleared=await evaluate("(()=>{const s=JSON.parse(localStorage.getItem('auth-store')||'null');return{token:localStorage.getItem('token'),storedToken:s?.state?.token??null,user:s?.state?.user??null}})()");assert.deepEqual(cleared,{token:null,storedToken:null,user:null});assert.equal(await evaluate("fetch('/api/auth/me').then(r=>r.status)"),401);
   activeStep='protected-route';await send('Page.navigate',{url:origin+'/teacher/profile'});await until("location.pathname==='/login'&&document.readyState!=='loading'",'protected route denied');await pause(1000);
   activeStep='relogin';await login('teacher');await navigate('/teacher/profile');await until("document.body.innerText.includes('Mi perfil')",'profile after relogin');
   return{scenario,width,height,home,controls,button,clientSessionCleared:true,anonymousStatus:401,protectedRouteDenied:true,relogin:true,passwordDialog:mobile,editorOpenedWithoutSaving:mobile};
  });
 }
}finally{await guard.db.$disconnect();socket.close();}
await fs.writeFile(`${output}/summary.json`,JSON.stringify({results:results.map(({id,status})=>({id,status})),exceptions,serverErrors:requests.filter(r=>r.status>=500),apiInterception:false},null,2));
if(results.some(r=>r.status==='FAIL')||exceptions.length)process.exitCode=1;
