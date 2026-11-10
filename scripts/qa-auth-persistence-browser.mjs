import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { SignJWT } from "jose";
import { realQaClient } from "./qa-real-client.mjs";

const stage3 = process.env.QA_BROWSER_STAGE3 === "1";
const catalog = true;
const extra = process.env.QA_BROWSER_EXTRA === "1";
const guard = await realQaClient(); 
const phase=process.argv[2];if(!["before","after"].includes(phase))throw Error("phase required");
const testedRoles=(process.env.QA_AUTH_ROLES??'citizen,teacher,reception,admin').split(',');
const origin = "http://localhost:3000", output = `audit-evidence/auth-persistence/browser-${phase}`;
const focused = process.env.QA_BROWSER_FOCUSED === "1";
const actionsOnly = process.env.QA_BROWSER_ACTIONS === "1";
const resultsFile = `${output}/${process.env.QA_LOGOUT_REPORT ?? "results"}.json`;
await fs.mkdir(output, { recursive: true });
const accounts = JSON.parse(await fs.readFile(".tmp/qa-postgres/accounts.private.json", "utf8"));
const tabs = await (await fetch("http://127.0.0.1:9224/json/list")).json();
let socket = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
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
  await until(`document.readyState!=='loading'&&location.pathname===${JSON.stringify(route.split('?')[0])}`, route); await idle(); await pause(1200); if (route.startsWith('/reception')) await selectVenue();
}
async function capture(name) { const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await fs.writeFile(`${output}/${name}.png`, Buffer.from(r.data, "base64")); }
async function test(id, work) { activeCase=id;activeStep="start";try { results.push({ id, status: "PASS", detail: await work() }); } catch (e) { let context; if (catalog) { try { context = await evaluate("({path:location.pathname,text:document.body?.innerText.slice(0,1000)})"); } catch {} } results.push({ id, status: "FAIL", detail: e.message, context }); } await fs.writeFile(resultsFile, JSON.stringify({ origin, apiInterception: false, results, requests, exceptions }, null, 2)); console.log(`${id}: ${results.at(-1).status}`); }
async function login(role) {
  await send('Page.navigate',{url:'about:blank'});await pause(400);
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
async function configure(){await send('Page.enable');await send('Page.setLifecycleEventsEnabled',{enabled:true});await send('Runtime.enable');await send('Network.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});}
async function restartBrowser(){
 const handler=socket.onmessage;
 const browser=await(await fetch('http://127.0.0.1:9224/json/version')).json(),control=new WebSocket(browser.webSocketDebuggerUrl);await new Promise(r=>control.onopen=r);control.send(JSON.stringify({id:1,method:'Browser.close'}));await new Promise(r=>control.onclose=r);
 for(let i=0;i<40;i++){try{await fetch('http://127.0.0.1:9224/json/version');await pause(100);}catch{break;}}
 const child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port=9224','--user-data-dir=C:/Proyectos/MAS_SanMiguel/.tmp/qa-postgres/auth-baseline-chrome','--no-first-run','--no-default-browser-check','--disable-background-timer-throttling','--disable-renderer-backgrounding','about:blank'],{detached:true,windowsHide:true,stdio:'ignore'});child.unref();
 let tab;for(let i=0;i<100;i++){try{tab=(await(await fetch('http://127.0.0.1:9224/json/list')).json()).find(t=>t.type==='page');if(tab)break;}catch{}await pause(100);}assert.ok(tab,'QA Chrome did not restart');
 socket=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});socket.onmessage=handler;inflight.clear();loadedDocuments.clear();await configure();
}
async function enter(route){inflight.clear();await send('Page.navigate',{url:origin+route});await pause(3500);await until("document.readyState!=='loading'",'document ready');}
async function reopenTab(route){
 const viewport=await evaluate('({width:innerWidth,height:innerHeight})');
 const handler=socket.onmessage,{targetInfo}=await send('Target.getTargetInfo');
 const {targetId}=await send('Target.createTarget',{url:'about:blank'});
 const tabs=await(await fetch('http://127.0.0.1:9224/json/list')).json(),tab=tabs.find(t=>t.id===targetId);assert.ok(tab);
 socket=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});socket.onmessage=handler;await send('Target.closeTarget',{targetId:targetInfo.targetId});inflight.clear();await configure();await send('Emulation.setDeviceMetricsOverride',{...viewport,deviceScaleFactor:1,mobile:viewport.width<768});await enter(route);
}
try{
 await configure();
 for(const role of testedRoles)await test(`RESTORE-LOGIN-${role}`,async()=>{
  const width=role==='admin'?1440:390,height=role==='admin'?900:844;await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:role!=='admin'});await login(role);
  assert.equal(await evaluate("fetch('/api/auth/me',{headers:{Authorization:'Bearer '+localStorage.getItem('token')}}).then(r=>r.status)"),200);
  await enter('/login');await pause(1500);await capture(`${role}-restore-login`);
  const state=await evaluate("({path:location.pathname,hasToken:!!localStorage.getItem('token'),hasCachedUser:!!JSON.parse(localStorage.getItem('auth-store')||'null')?.state?.user})");
  assert.notEqual(state.path,'/login',`Valid persisted session remains at login: ${JSON.stringify(state)}`);return state;
 });
 if(phase==='after')for(const role of testedRoles)await test(`PERSISTENT-CONTEXT-${role}`,async()=>{
  const width=role==='admin'?1440:390,height=role==='admin'?900:844,profile=role==='admin'?'/':'/'+role+'/profile';await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:role!=='admin'});await login(role);
  if(role==='teacher'||role==='reception'){await enter(`/select-venue?workspace=${role}`);await selectVenue();}
  await enter(profile);await until("location.pathname!== '/login'",'authorized profile');
  const selected=await evaluate(`sessionStorage.getItem('massm:'+JSON.parse(localStorage.getItem('auth-store')).state.user.id+':${role}:establishment')`);
  await send('Page.reload',{ignoreCache:true});await pause(3500);assert.notEqual(await evaluate('location.pathname'),'/login');
  await reopenTab(profile);await pause(2000);assert.notEqual(await evaluate('location.pathname'),'/login');
  await restartBrowser();await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:role!=='admin'});await enter('/login');await until("location.pathname!=='/login'",'restore from persistent Chrome profile');await enter(profile);
  const recovered=await evaluate(`({path:location.pathname,selected:sessionStorage.getItem('massm:'+JSON.parse(localStorage.getItem('auth-store')).state.user.id+':${role}:establishment')})`);assert.notEqual(recovered.path,'/login');
  await capture(`${role}-persistent-reopen`);
  if(role==='teacher'||role==='reception')await test(`VENUE-RESTORED-${role}`,async()=>{assert.equal(recovered.selected,selected);return{selected,recovered:recovered.selected};});
  const oldToken=await evaluate("localStorage.getItem('token')");assert.ok(oldToken);
  if(role==='admin')await enter('/logout');else {await until("!!document.querySelector('[data-mobile-profile-logout]')",'existing mobile logout');await clickVisible("document.querySelector('[data-mobile-profile-logout]')");}
  await until("location.pathname==='/login'",'explicit logout');assert.equal(await evaluate("localStorage.getItem('token')"),null);
  const replay=await fetch(origin+'/api/auth/me',{headers:{Authorization:`Bearer ${oldToken}`}});
  results.push({id:`SERVER-REVOCATION-${role}`,status:replay.status===401?'PASS':'FAIL',detail:{status:replay.status,preexisting:true,implementationBlockedByMissingSessionStorage:true}});
  await restartBrowser();await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:role!=='admin'});await enter(profile);await until("location.pathname==='/login'",'explicit logout not recovered');await capture(`${role}-logout-reopen`);
  return{profilePersistedAcrossProcessRestart:true,newTabPersisted:true,explicitLogoutNotRestored:true,selected,recovered:recovered.selected,physicalDevice:false};
 });
 if(phase==='after')for(const role of testedRoles)await test(`EXPIRED-PERSISTENT-${role}`,async()=>{
  const width=role==='admin'?1440:390,height=role==='admin'?900:844;await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:role!=='admin'});await login(role);
  const token=await new SignJWT({uid:guard.users[role].id}).setProtectedHeader({alg:'HS256'}).setIssuedAt(Math.floor(Date.now()/1000)-120).setExpirationTime(Math.floor(Date.now()/1000)-30).sign(new TextEncoder().encode(process.env.JWT_SECRET||'dev-secret-change-me'));
  await evaluate(`(()=>{const cached=JSON.parse(localStorage.getItem('auth-store'));cached.state.token=${JSON.stringify(token)};localStorage.setItem('auth-store',JSON.stringify(cached));localStorage.setItem('token',${JSON.stringify(token)});})()`);
  await enter(role==='admin'?'/':'/'+role+'/profile');await until("location.pathname==='/login'",'expired persistent session denied');assert.equal(await evaluate("localStorage.getItem('token')"),null);await capture(`${role}-expired-session`);return{expiredSignedFixture:true,serverDenied:true,clientCleared:true,clockModified:false};
 });
}finally{await guard.db.$disconnect();socket.close();}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
