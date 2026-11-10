import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { realQaClient } from "./qa-real-client.mjs";

const stage3 = process.env.QA_BROWSER_STAGE3 === "1";
const catalog = true;
const extra = process.env.QA_BROWSER_EXTRA === "1";
const guard = await realQaClient(); 
const phase=process.argv[2];if(!["before","after"].includes(phase))throw Error("phase required");
const origin = "http://localhost:3000", output = `audit-evidence/mobile-logout/browser-${phase}`;
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
  if (msg.method === "Page.lifecycleEvent" && msg.params.name === "load") loadedDocuments.add(msg.params.loaderId);
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
  await until(`document.readyState==='complete'&&location.pathname===${JSON.stringify(route.split('?')[0])}`, route); await idle(); await pause(1200); if (route.startsWith('/reception')) await selectVenue();
}
async function capture(name) { const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await fs.writeFile(`${output}/${name}.png`, Buffer.from(r.data, "base64")); }
async function test(id, work) { activeCase=id;activeStep="start";try { results.push({ id, status: "PASS", detail: await work() }); } catch (e) { let context; if (catalog) { try { context = await evaluate("({path:location.pathname,text:document.body?.innerText.slice(0,1000)})"); } catch {} } results.push({ id, status: "FAIL", detail: e.message, context }); } await fs.writeFile(resultsFile, JSON.stringify({ origin, apiInterception: false, results, requests, exceptions }, null, 2)); console.log(`${id}: ${results.at(-1).status}`); }
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
const footer=`[...document.querySelectorAll('footer')].filter(${visible}).find(el=>el.textContent.includes('Contraseña')&&el.textContent.includes('Editar perfil'))`;
const geometry=()=>evaluate(`(()=>{const f=${footer};return[...f.querySelectorAll('button')].map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{text:el.textContent.trim(),x:r.x,y:r.y,width:r.width,height:r.height,className:el.className,fontSize:s.fontSize,background:s.backgroundColor,color:s.color}})})()`);
try{
  await send("Page.enable");await send("Page.setLifecycleEventsEnabled",{enabled:true});await send("Runtime.enable");await send("Network.enable");await send("Emulation.setFocusEmulationEnabled",{enabled:true});await send("Network.setCacheDisabled",{cacheDisabled:true});
  const baseline=phase==='after'?JSON.parse(await fs.readFile('audit-evidence/mobile-logout/browser-before/results.json','utf8')):null;
  for(const role of(process.env.QA_LOGOUT_ROLES??'citizen,teacher,reception').split(',')){
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await login(role);
    const route=`/${role}/profile`;
    for(const [width,height]of[[320,700],[375,812],[390,844],[430,932]].filter(([w])=>!process.env.QA_LOGOUT_WIDTHS||process.env.QA_LOGOUT_WIDTHS.split(',').includes(String(w))))await test(`PROFILE-${role}-${width}`,async()=>{
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await navigate(route);await until(`!!(${footer})`,'profile footer');
      const buttons=await geometry();await capture(`${role}-${width}-top`);
      if(phase==='before'&&!process.env.QA_LOGOUT_DIAGNOSTIC)return{role,width,height,buttons};
      if(phase==='after'){const previous=baseline.results.find(r=>r.id===`PROFILE-${role}-${width}`);assert.equal(previous.status,'PASS');assert.deepEqual(buttons,previous.detail.buttons,'Existing password/edit controls changed');}
      activeStep="password-dialog";await clickVisible(`(${footer}).querySelector('button')`);await until("!!document.querySelector('[role=dialog]')",'original password dialog');
      assert.equal(await evaluate("document.querySelectorAll('[role=dialog] input[type=password]').length"),3);
      assert.ok(await evaluate("[...document.querySelectorAll('[role=dialog] button')].some(el=>el.textContent.trim()==='Guardar'&&el.disabled)"));
      await evaluate("document.querySelectorAll('[role=dialog] input')[0].id='qa-pw-current';document.querySelectorAll('[role=dialog] input')[1].id='qa-pw-new';document.querySelectorAll('[role=dialog] input')[2].id='qa-pw-confirm'");
      await fill('#qa-pw-current','QA_TEST-current');await fill('#qa-pw-new','12345');await fill('#qa-pw-confirm','12345');
      assert.ok(await evaluate("[...document.querySelectorAll('[role=dialog] button')].find(el=>el.textContent.trim()==='Guardar').disabled"));
      await fill('#qa-pw-new','123456');await fill('#qa-pw-confirm','123456');await until("![...document.querySelectorAll('[role=dialog] button')].find(el=>el.textContent.trim()==='Guardar').disabled",'original password validation');
      await capture(`${role}-${width}-password`);await clickVisible("[...document.querySelectorAll('[role=dialog] button')].find(el=>el.textContent.trim()==='Cancelar')");await until("!document.querySelector('[role=dialog]')",'password dialog cancelled');
      activeStep="profile-editor";await clickVisible(`(${footer}).querySelectorAll('button')[1]`);await until(`[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.textContent.includes('Guardar cambios'))`,'original profile editor');
      assert.ok(await evaluate(`[...document.querySelectorAll('input')].filter(${visible}).length>2`));await capture(`${role}-${width}-edit`);
      await navigate(route);await until(`!!(${footer})`,'profile restored without saving');
      if(process.env.QA_LOGOUT_DIAGNOSTIC){
        activeStep="logout";
        if(phase==='before')await send('Page.navigate',{url:origin+'/logout'});else await clickVisible("document.querySelector('[data-mobile-profile-logout]')");
        await until("location.pathname==='/login'&&document.readyState==='complete'",'diagnostic logout');
        activeStep="protected-route";await send('Page.navigate',{url:origin+route});await until("location.pathname==='/login'&&document.readyState==='complete'",'diagnostic protected route');
        activeStep="relogin";await login(role);await navigate(route);await until(`!!(${footer})`,'diagnostic relogin');return{role,width,passwordAndEditExercised:true,logoutMechanism:phase==='before'?'original /logout route':'new button',relogin:true};
      }
      const selector="[data-mobile-profile-logout]";await until(`!!document.querySelector('${selector}')`,'logout button');
      const oldToken=await evaluate("localStorage.getItem('token')");assert.ok(oldToken);
      await evaluate(`document.querySelector('${selector}').scrollIntoView({block:'center',behavior:'instant'})`);await pause(200);
      const button=await evaluate(`(()=>{const e=document.querySelector('${selector}'),r=e.getBoundingClientRect(),p=e.previousElementSibling,s=getComputedStyle(e);return{x:r.x,y:r.y,width:r.width,height:r.height,previous:p.textContent,position:s.position,background:s.backgroundColor,color:s.color,border:s.borderColor,footer:!!e.closest('footer'),scrollY,documentWidth:document.documentElement.scrollWidth,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}})()`);
      assert.ok(button.previous.includes('Cobertura médica'));assert.ok(!button.footer);assert.ok(button.height>=44);assert.ok(button.hit);assert.ok(button.documentWidth<=width+1);assert.equal(button.background,'rgb(255, 255, 255)');
      await capture(`${role}-${width}-logout`);
      const point={x:button.x+button.width/2,y:button.y+button.height/2};
      for(let i=0;i<2;i++){await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',buttons:0,clickCount:1});}
      await until("location.pathname==='/login'&&document.readyState==='complete'",'logout redirects to login');
      const cleared=await evaluate("(()=>{const s=JSON.parse(localStorage.getItem('auth-store')||'null');return{token:localStorage.getItem('token'),storedToken:s?.state?.token??null,user:s?.state?.user??null}})()");assert.equal(cleared.token,null);assert.equal(cleared.storedToken,null);assert.equal(cleared.user,null);
      const anonymous=await evaluate("fetch('/api/auth/me').then(r=>r.status)");assert.equal(anonymous,401);
      await send('Page.navigate',{url:origin+route});await until("location.pathname==='/login'&&document.readyState==='complete'",'protected profile denied after logout');
      await capture(`${role}-${width}-signed-out`);
      if(width===320)await test(`PREEXISTING-JWT-REVOCATION-${role}`,async()=>{const r=await fetch(origin+'/api/auth/me',{headers:{Authorization:`Bearer ${oldToken}`}});assert.equal(r.status,401,`Previously copied JWT still accepted (${r.status}); existing stateless logout has no server revocation. No authentication changes authorized.`);return{oldTokenRejected:true};});
      await login(role);await navigate(route);await until(`!!(${footer})`,'subsequent login and profile');
      return{role,width,height,buttons,button,passwordDialogAndValidation:true,profileEditor:true,savedProfile:false,clientSessionCleared:true,anonymousStatus:anonymous,protectedRouteDenied:true,relogin:true,doubleClick:true};
    });
    await test(`DESKTOP-${role}`,async()=>{await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await navigate(route);await until("document.body.innerText.includes('Mi perfil')",'desktop profile');assert.equal(await evaluate(`[...document.querySelectorAll('[data-mobile-profile-logout]')].filter(${visible}).length`),0);await capture(`${role}-desktop`);return{width:1440,mobileLogoutHidden:true,profileLoaded:true};});
  }
}finally{await guard.db.$disconnect();socket.close();}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
