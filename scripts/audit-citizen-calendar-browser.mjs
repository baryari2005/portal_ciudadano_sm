/** Browser audit of the real local app. All API requests are fulfilled with fixtures; external requests are blocked. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const origin=process.env.AUDIT_ORIGIN??'http://127.0.0.1:3000';
const cdp=process.env.AUDIT_CDP??'http://127.0.0.1:9223';
const output='audit-evidence';
await mkdir(output,{recursive:true});
const tabs=await(await fetch(`${cdp}/json/list`)).json();
const tab=tabs.find(item=>item.type==='page');
assert.ok(tab,'Start an isolated Chrome session with remote debugging before this audit');
const socket=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let sequence=0,failNextSchedule=false;
const pending=new Map(),requests=[],exceptions=[];
function send(method,params={}){
 const id=++sequence;
 return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},45000);pending.set(id,{resolve,reject,timeout});socket.send(JSON.stringify({id,method,params}));});
}
const fixtureUser={id:'audit-fixture-user',userId:'audit-fixture',nombre:'Prueba',apellido:'Aislada',email:'audit@example.invalid',perfilCompleto:true,estado:'ACTIVO',mustChangePassword:false,rol:{id:1,codigo:'citizen',nombre:'Ciudadano'},permisos:[]};
function fixtureSchedule(url){
 const from=url.searchParams.get('dateFrom'),to=url.searchParams.get('dateTo'),items=[];
 for(let day=new Date(`${from}T00:00:00Z`);day<=new Date(`${to}T00:00:00Z`);day=new Date(day.getTime()+86400000)){
  const date=day.toISOString().slice(0,10);
  for(const [index,label] of ['A','B','C','D','E'].entries()){
   const cancelled=label==='E',past=date<'2026-10-25';
   const enrollmentStatus=label==='C'?'PENDIENTE':label==='D'?'LISTA_ESPERA':'CONFIRMADA';
   items.push({id:`${date}-${label}`,date,startTime:'18:00',endTime:'19:00',sessionStatus:cancelled?'CANCELADA':'PROGRAMADA',enrollmentStatus,displayStatus:cancelled?'CANCELADA':past?'PRESENTE':enrollmentStatus,space:'Salón de actividades',activity:{id:label,name:`Actividad ${label} ${label==='D'?'con un nombre muy extenso para comprobar que el texto no desborda la pantalla del celular':'de prueba'}`,imageUrl:null,enrollmentMode:'PERMANENTE',cancellationNoticeHours:24},establishment:{id:'fixture-establishment',name:'Establecimiento con un nombre extenso de prueba'},primaryProfessor:index%2===0?'Profesor de prueba':null,reservation:null,capacity:20,reservedCount:5});
  }
 }
 return{data:{total:items.length,items}};
}
socket.onmessage=async event=>{
 const message=JSON.parse(event.data);
 if(message.id){const entry=pending.get(message.id);if(entry){clearTimeout(entry.timeout);pending.delete(message.id);if(message.error)entry.reject(new Error(JSON.stringify(message.error)));else entry.resolve(message.result);}return;}
 if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params.exceptionDetails.text);
 if(message.method!=='Fetch.requestPaused')return;
 const {requestId,request}=message.params,url=new URL(request.url);
 try{
  if(url.origin!==origin){await send('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});return;}
  if(!url.pathname.startsWith('/api/')){await send('Fetch.continueRequest',{requestId});return;}
  requests.push({method:request.method,path:url.pathname,query:url.search});
  let body={data:null},status=200;
  if(url.pathname==='/api/auth/me')body={user:fixtureUser};
  else if(url.pathname==='/api/server-time')body={now:'2026-10-25T15:00:00Z',timeZone:'America/Argentina/Buenos_Aires'};
  else if(url.pathname==='/api/citizen/notifications')body={data:{items:[],meta:{total:0,unreadCount:0,page:1,pageCount:1,pageSize:5}}};
  else if(url.pathname==='/api/citizen/schedule'){
   if(failNextSchedule){status=500;body={message:'Error de prueba'};failNextSchedule=false;}else body=fixtureSchedule(url);
  }
  await send('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(body)).toString('base64')});
 }catch(error){exceptions.push(String(error));}
};
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value;}
async function until(expression,label){const deadline=Date.now()+60000;while(Date.now()<deadline){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,150));}throw new Error(`Timed out: ${label}`);}
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
const results=[];
try{
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Network.setBypassServiceWorker',{bypass:true});
 await send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
 await send('Emulation.setTimezoneOverride',{timezoneId:'America/Argentina/Buenos_Aires'});
 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`const OriginalDate=Date;window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:['2026-10-25T15:00:00Z']))}static now(){return OriginalDate.parse('2026-10-25T15:00:00Z')}};localStorage.setItem('token','audit-fixture-token');localStorage.setItem('auth-store',JSON.stringify({state:{token:'audit-fixture-token',user:${JSON.stringify(fixtureUser)}},version:0}));`});
 for(const width of [320,375,390,430]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url:`${origin}/citizen/schedule`});
  await until("[...document.querySelectorAll('h2')].some(el=>el.textContent==='octubre 2026')",'current month');
  await until("[...document.querySelectorAll('button')].some(el=>el.textContent.includes('Actividad B'))",'fixture cards');
  const metrics=await noOverflow();
  const days=await evaluate(`[...document.querySelectorAll('button[aria-pressed][aria-label]')].filter(${visible}).map(el=>({text:el.textContent,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}))`);
  assert.equal(days.length,7);assert.ok(days.every(day=>day.width>=39&&day.height>=44));
  await screenshot(`calendar-${width}`);
  const before=requests.filter(item=>item.path==='/api/citizen/schedule').length;
  await touch(aria('Mes siguiente'));
  await until("[...document.querySelectorAll('h2')].some(el=>el.textContent==='noviembre 2026')&&[...document.querySelectorAll('button')].some(el=>el.textContent.includes('Actividad B'))",'next month');
  assert.equal(requests.filter(item=>item.path==='/api/citizen/schedule').length-before,1);
  await noOverflow();
  await touch(aria('Mes anterior'));
  await until("[...document.querySelectorAll('h2')].some(el=>el.textContent==='octubre 2026')&&[...document.querySelectorAll('button')].some(el=>el.textContent.includes('Actividad B'))",'previous month');
  await touch(aria('Abrir calendario'));
  await until("!!document.querySelector('[data-slot=popover-content]')",'date picker');
  const picker=await evaluate("(()=>{const r=document.querySelector('[data-slot=popover-content]').getBoundingClientRect();return{left:r.left,right:r.right,width:r.width}})()");
  assert.ok(picker.left>=-1&&picker.right<=width+1,JSON.stringify(picker));
  const pickerDays=await evaluate("[...document.querySelectorAll('[data-slot=calendar] button[data-day]')].slice(0,7).map(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width}})");
  assert.ok(pickerDays.every((day,index)=>index===0||day.left>=pickerDays[index-1].right-1),JSON.stringify(pickerDays));
  await screenshot(`picker-${width}`);
  await touch("[...document.querySelectorAll('[data-slot=calendar] button[data-day]')].find(el=>el.textContent.trim()==='5'&&!el.disabled)");
  await until("!document.querySelector('[data-slot=popover-content]')",'picker closed');
  await touch(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.textContent.includes('Actividad B'))`);
  await until("[...document.querySelectorAll('dd')].some(el=>el.textContent==='Sin profesor asignado')",'unassigned class detail');
  assert.equal(await evaluate(`[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.textContent.includes('No asistiré'))`),false);
  await noOverflow();await screenshot(`history-detail-${width}`);
  await touch(button('Volver al listado'));
  await touch(aria('Abrir calendario'));
  await until("!!document.querySelector('[data-slot=popover-content]')",'picker reopened');
  await touch("[...document.querySelectorAll('[data-slot=calendar] button[data-day]')].find(el=>el.textContent.trim()==='25'&&!el.disabled)");
  await touch(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.textContent.includes('Actividad B'))`);
  await until(`[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.textContent.includes('No asistiré'))`,'absence action');
  await touch(button('No asistiré a esta clase'));
  await until("!!document.querySelector('[role=dialog]')",'absence dialog');
  const dialog=await evaluate("(()=>{const r=document.querySelector('[role=dialog]').getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom}})()");
  assert.ok(dialog.left>=0&&dialog.right<=width+1&&dialog.top>=0&&dialog.bottom<=844,JSON.stringify(dialog));
  await screenshot(`dialog-${width}`);await touch(button('Volver'));
  await touch(button('Volver al listado'));
  await touch(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.textContent.includes('Actividad E'))`);
  await until(`[...document.querySelectorAll('h2')].filter(${visible}).some(el=>el.textContent.includes('Actividad E'))`,'cancelled class detail');
  assert.equal(await evaluate(`[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.textContent.includes('No asistir\u00e9')||el.textContent.includes('Reservar esta clase'))`),false);
  await touch(button('Volver al listado'));
  await touch(`[...document.querySelectorAll('button')].filter(${visible}).find(el=>el.textContent.includes('Actividad D'))`);
  await until(`[...document.querySelectorAll('h2')].filter(${visible}).some(el=>el.textContent.includes('Actividad D'))`,'long activity detail');
  await noOverflow();
  const detailBounds=await evaluate(`(()=>{const el=[...document.querySelectorAll('h2')].filter(${visible}).find(el=>el.textContent.includes('Actividad D'));const r=el.getBoundingClientRect();return{top:r.top,left:r.left,right:r.right}})()`);
  assert.ok(detailBounds.top>=80&&detailBounds.left>=0&&detailBounds.right<=width,JSON.stringify(detailBounds));
  await screenshot(`long-detail-${width}`);
  const scrollBefore=await evaluate("[...document.querySelectorAll('main')].find(el=>getComputedStyle(el).overflowY==='auto').scrollTop");
  const scrollTarget=await evaluate("(()=>{const r=[...document.querySelectorAll('main')].find(el=>getComputedStyle(el).overflowY==='auto').getBoundingClientRect();return{y:Math.min(r.bottom-40,600),height:innerHeight,width:innerWidth,scrollHeight:[...document.querySelectorAll('main')].find(el=>getComputedStyle(el).overflowY==='auto').scrollHeight}})()");
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:width/2,y:scrollTarget.y}]});
  for(let distance=20;distance<=280;distance+=20){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,x:width/2,y:scrollTarget.y-distance}]});await new Promise(resolve=>setTimeout(resolve,30));}
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await new Promise(resolve=>setTimeout(resolve,300));
  const scrollAfter=await evaluate("[...document.querySelectorAll('main')].find(el=>getComputedStyle(el).overflowY==='auto').scrollTop");
  assert.ok(scrollAfter>scrollBefore,JSON.stringify({scrollBefore,scrollAfter,scrollTarget}));
  await touch(button('Volver al listado'));
  await send('Page.reload');
  await until("[...document.querySelectorAll('h2')].some(el=>el.textContent==='octubre 2026')&&[...document.querySelectorAll('button')].some(el=>el.textContent.includes('Actividad B'))",'reload month');
  results.push({width,status:'VERIFIED_WITH_BROWSER_FIXTURES',metrics,days,picker,dialog,detailBounds,touchScroll:{before:scrollBefore,after:scrollAfter}});
  console.log(`OK browser: ${width}px, touch, month navigation, history, unassigned detail, reload and dialog`);
 }
 assert.equal(requests.filter(item=>item.path.endsWith('/ensure')).length,0);
 const before=requests.length;failNextSchedule=true;
 await touch(aria('Mes siguiente'));
 await until("document.body.textContent.includes('No pudimos cargar tus clases.')",'error state');
 await touch(button('Reintentar'));
 await until("[...document.querySelectorAll('button')].some(el=>el.textContent.includes('Actividad B'))",'retry recovery');
 assert.ok(requests.length>before);
 await touch(button('Lista'));
 await until(`[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.textContent.includes('Actividad B'))`,'list view');
 await noOverflow();
 await screenshot('list-430');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:`${origin}/citizen/schedule`});
 await until(`[...document.querySelectorAll('h2')].filter(${visible}).some(el=>el.textContent==='octubre 2026')&&[...document.querySelectorAll('button')].filter(${visible}).some(el=>el.textContent.includes('Actividad B'))`,'desktop calendar');
 const desktopMetrics=await noOverflow();
 await screenshot('calendar-desktop-1440');
 assert.equal(requests.filter(item=>item.path.endsWith('/ensure')).length,0);
 await writeFile(`${output}/browser-results.json`,JSON.stringify({results,desktopMetrics,requests,exceptions,usesProductionData:false},null,2));
 console.log(JSON.stringify({sizes:results.map(item=>item.width),exceptions,postRequests:requests.filter(item=>item.method==='POST').length}));
 assert.equal(exceptions.length,0);
} catch(error){await screenshot('browser-failure').catch(()=>{});await writeFile(`${output}/browser-failure.json`,JSON.stringify({error:String(error),requests,exceptions},null,2));throw error;}
finally{socket.close();}
