/** Browser audit of the real local app. All API requests are fulfilled with fixtures; external requests are blocked. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const origin=process.env.AUDIT_ORIGIN??'http://127.0.0.1:3000';
const cdp=process.env.AUDIT_CDP??'http://127.0.0.1:9223';
const output='audit-evidence/reception';
await mkdir(output,{recursive:true});
const tabs=await(await fetch(`${cdp}/json/list`)).json();
const tab=tabs.find(item=>item.type==='page');
assert.ok(tab,'Start an isolated Chrome session with remote debugging before this audit');
const socket=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let sequence=0;
const pending=new Map(),requests=[],exceptions=[];
function send(method,params={}){
 const id=++sequence;
 return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},45000);pending.set(id,{resolve,reject,timeout});socket.send(JSON.stringify({id,method,params}));});
}

const fixtureUser={id:'reception-audit',userId:'reception-audit',nombre:'Recepcion',apellido:'Prueba',email:'reception@example.invalid',perfilCompleto:true,estado:'ACTIVO',mustChangePassword:false,rol:{id:1,codigo:'reception',nombre:'Recepcion'},permisos:[{modulo:'access',accion:'ver'},{modulo:'access',accion:'crear'}]};
const photo='/audit-person.svg';
const person={id:'fixture-person',nombre:'Ana Maria de los Angeles',apellido:'Fernandez de la Comunidad San Miguel',dni:'12345678',email:'ana.maria.apellido.extremadamente.largo@correo-de-pruebas.example.invalid',estado:'ACTIVO',profilePhotoUrl:photo,avatarUrl:'/wrong-photo.svg'};
const evaluation={allowed:true,result:'PERMITIDO',reason:'USUARIO_HABILITADO',message:'Ingreso autorizado.',matchedSession:{id:'session',activityName:'Actividad con un nombre extenso de prueba',startTime:'09:00',endTime:'10:00'}};
const response={...evaluation,user:person,accessRecordId:'fixture-access',occurredAt:'2026-10-25T15:00:00Z'};
const fallback={...person,id:'fallback',nombre:'Sin',apellido:'Fotografia',profilePhotoUrl:null,avatarUrl:null};
let qrAllowed=true;
socket.onmessage=async event=>{
 const message=JSON.parse(event.data);
 if(message.id){const entry=pending.get(message.id);if(entry){clearTimeout(entry.timeout);pending.delete(message.id);if(message.error)entry.reject(new Error(JSON.stringify(message.error)));else entry.resolve(message.result);}return;}
 if(message.method==='Runtime.exceptionThrown')exceptions.push({text:message.params.exceptionDetails.text,description:message.params.exceptionDetails.exception?.description,url:message.params.exceptionDetails.url});
 if(message.method!=='Fetch.requestPaused')return;
 const {requestId,request}=message.params,url=new URL(request.url);
 try{
  if(url.origin!==origin){await send('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});return;}
  if(url.pathname===photo){await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/svg+xml'}],body:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#819B56"/><circle cx="48" cy="32" r="18" fill="#fff"/><path d="M15 96V80a33 33 0 0 1 66 0v16" fill="#fff"/></svg>').toString('base64')});return;}
  if(!url.pathname.startsWith('/api/')){await send('Fetch.continueRequest',{requestId});return;}
  requests.push({method:request.method,path:url.pathname,query:url.search,body:request.postData});
  let body={data:null};
  if(url.pathname==='/api/auth/me')body={user:fixtureUser};
  else if(url.pathname==='/api/server-time')body={now:'2026-10-25T15:00:00Z',timeZone:'America/Argentina/Buenos_Aires'};
  else if(url.pathname.includes('notifications'))body={data:{items:[],meta:{total:0,unreadCount:0,page:1,pageCount:1,pageSize:5}}};
  else if(url.pathname==='/api/access')body={data:[{id:'venue',nombre:'Sede ficticia'}]};
  else if(url.pathname==='/api/access/manual/search')body={data:[{...person,validation:evaluation},{...fallback,validation:evaluation}],meta:{total:2,page:1,pageSize:8,pageCount:1}};
  else if(url.pathname==='/api/access/manual/register'){const input=JSON.parse(request.postData);body={data:{...response,allowed:input.decision==='ALLOW',result:input.decision==='ALLOW'?'PERMITIDO':'RECHAZADO',reason:input.decision==='ALLOW'?'ACCESO_MANUAL_AUTORIZADO':'ACCESO_MANUAL_RECHAZADO'}};}
  else if(url.pathname==='/api/access/qr/validate')body={...response,allowed:qrAllowed,result:qrAllowed?'PERMITIDO':'RECHAZADO'};
  await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(body)).toString('base64')});
 }catch(error){exceptions.push(String(error));}
};
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value;}
async function until(expression,label){const start=Date.now(),deadline=start+60000;let reloaded=false;while(Date.now()<deadline){if(await evaluate(expression))return;if(!reloaded&&label.endsWith('ready')&&Date.now()-start>12000){reloaded=true;await send('Page.reload',{ignoreCache:true});}await new Promise(resolve=>setTimeout(resolve,150));}throw new Error(`Timed out: ${label}`);}
const visible="el=>el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0&&getComputedStyle(el).visibility!=='hidden'";
async function touch(expression){
 const box=await evaluate(`(()=>{const el=${expression};if(!el)throw new Error('Missing touch target');el.scrollIntoView({block:'center',behavior:'instant'});const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x,y:box.y}]});
 await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await new Promise(resolve=>setTimeout(resolve,300));
}
const button=(text)=>`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.textContent.trim()===${JSON.stringify(text)})`;
const aria=(label)=>`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.getAttribute('aria-label')===${JSON.stringify(label)})`;
async function screenshot(name){await new Promise(resolve=>setTimeout(resolve,250));const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(`${output}/${name}.png`,Buffer.from(result.data,'base64'));}
async function noOverflow(){const metrics=await evaluate(`({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth})`);assert.ok(metrics.document<=metrics.viewport+1,JSON.stringify(metrics));return metrics;}

async function fill(selector,value){await evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].filter(${visible})[0];const setter=Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
const firstCard=`[...document.querySelectorAll('[data-access-person-card]')].filter(${visible})[0]`;
async function identityMetrics(){return evaluate(`(()=>{const card=${firstCard};const avatar=card.querySelector('[data-slot=avatar]'),image=avatar.querySelector('img');const r=avatar.getBoundingClientRect();const cs=getComputedStyle(card);return{photo:image?.getAttribute('src'),photoLoaded:!!image?.naturalWidth,width:r.width,height:r.height,padding:cs.padding,borderRadius:cs.borderRadius,font:getComputedStyle(card).fontFamily,background:cs.backgroundColor,text:card.textContent,overflow:card.scrollWidth>card.clientWidth+1};})()`);}
const results=[];
try{
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Network.setBypassServiceWorker',{bypass:true});await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.origin===${JSON.stringify(origin)}){localStorage.setItem('token','audit-fixture-token');localStorage.setItem('auth-store',JSON.stringify({state:{token:'audit-fixture-token',user:${JSON.stringify(fixtureUser)}},version:0}));HTMLVideoElement.prototype.requestVideoFrameCallback=function(callback){return setTimeout(()=>callback(performance.now(),{}),100)};HTMLVideoElement.prototype.cancelVideoFrameCallback=function(id){clearTimeout(id)};window.BarcodeDetector=class{static async getSupportedFormats(){return ['qr_code']}async detect(){return [{rawValue:'fixture-personal-qr',cornerPoints:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]}]}};navigator.mediaDevices.enumerateDevices=async()=>[{kind:'videoinput',deviceId:'fixture-camera',label:'Fixture camera',groupId:'fixture'}];navigator.mediaDevices.getUserMedia=async()=>{const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;const ctx=canvas.getContext('2d');setInterval(()=>{ctx.fillStyle='#819B56';ctx.fillRect(0,0,320,240)},100);return canvas.captureStream(10)};}`});
 for(const width of [320,375,390,430,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
  await send('Page.navigate',{url:'about:blank'});
  await send('Page.navigate',{url:`${origin}/reception/manual`});
  await until(`[...document.querySelectorAll('input')].filter(${visible}).some(el=>el.placeholder.includes('Buscar'))`,'manual search ready');
  for(const query of ['Ana','12345678','ana@example.invalid']){const before=requests.length;await fill('input',query);await until(`!!(${firstCard})`,'manual results');await new Promise(r=>setTimeout(r,550));assert.ok(requests.slice(before).some(r=>r.path==='/api/access/manual/search'&&new URLSearchParams(r.query).get('q')===query));}
  await until(`[...document.querySelectorAll('[data-access-person-card] img')].filter(${visible}).some(el=>el.naturalWidth>0)`,'photo loaded');
  const search=await identityMetrics();assert.equal(search.photo,photo);assert.equal(search.width,width<768?80:96);assert.equal(search.height,search.width);assert.equal(search.overflow,false);
  assert.ok(await evaluate(`[...document.querySelectorAll('[data-access-person-card]')].filter(${visible}).some(el=>el.textContent.includes('Sin Fotografia')&&el.querySelector('[data-slot=avatar-fallback]'))`));
  await noOverflow();await screenshot(`manual-search-${width}`);
  if(width<768){await touch(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.querySelector('[data-access-person-card]'))`);await until(`[...document.querySelectorAll('textarea')].filter(${visible}).length>0`,'manual detail');}
  if(width>=768)await evaluate(`[...document.querySelectorAll('[data-access-person-card]')].filter(${visible}).at(-1).scrollIntoView({block:'start',behavior:'instant'})`);
  const manual=await identityMetrics();await noOverflow();await screenshot(`manual-detail-${width}`);
  assert.ok(await evaluate(`${button('Permitir ingreso')}.disabled&&${button('Rechazar ingreso')}.disabled`));
  await fill('textarea','Prueba local aislada');
  await until(`!${button('Permitir ingreso')}.disabled`,'enabled manual action');
  const buttons=await evaluate(`[${button('Permitir ingreso')},${button('Rechazar ingreso')}].map(el=>{const r=el.getBoundingClientRect();return{width:r.width,height:r.height,overflow:el.scrollWidth>el.clientWidth+1}})`);
  assert.ok(buttons.every(b=>b.height>=44&&!b.overflow));
  await touch(button('Permitir ingreso'));await until(`[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.textContent==='Nueva búsqueda')`,'manual registered');
  assert.ok(requests.some(r=>r.path==='/api/access/manual/register'&&JSON.parse(r.body).decision==='ALLOW'));
  await screenshot(`manual-allowed-${width}`);await noOverflow();
  await touch(button('Nueva búsqueda'));
  if(width<768){await touch(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.querySelector('[data-access-person-card]'))`);}
  await fill('textarea','Rechazo local de prueba');await touch(button('Rechazar ingreso'));
  await until(`[...document.querySelectorAll('h2')].filter(${visible}).some(el=>el.textContent==='Acceso rechazado')`,'manual rejected');
  await noOverflow();
  qrAllowed=true;
  await send('Page.navigate',{url:`${origin}/reception/scan`});
  await until(`[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.textContent.trim()===${JSON.stringify(width<768?'Iniciar':'Iniciar escaneo')})`,'scanner ready');
  await touch(button(width<768?'Iniciar':'Iniciar escaneo'));
  await until(`!!(${firstCard})`,'QR identity result');
  await until(`[...document.querySelectorAll('[data-access-person-card] img')].filter(${visible}).some(el=>el.naturalWidth>0)`,'QR image loaded');
  const qr=await identityMetrics();await noOverflow();await screenshot(`qr-result-${width}`);
  for(const key of ['photo','width','height','padding','borderRadius','font','background'])assert.equal(qr[key],manual[key],`Manual and QR ${key} at ${width}`);
  if(width<768){assert.ok(await evaluate(`!${button('Aceptar')}.disabled&&${button('Rechazar')}.disabled`));}
  results.push({width,search,manual,qr,buttons});
  await writeFile(`${output}/results.json`,JSON.stringify({status:'RUNNING',results,requests,exceptions},null,2));
 }
 assert.equal(exceptions.length,0,JSON.stringify(exceptions));
 await writeFile(`${output}/results.json`,JSON.stringify({status:'PASS',results,requests,exceptions,externalRequestsBlocked:true,apiRequestsIntercepted:true},null,2));
 console.log(JSON.stringify({status:'PASS',widths:results.map(r=>r.width),exceptions,requests:requests.length}));
} catch(error){await screenshot('failure');await writeFile(`${output}/failure.json`,JSON.stringify({error:String(error),requests,exceptions,body:await evaluate('document.body.innerText')},null,2));throw error;}
finally{socket.close();}
