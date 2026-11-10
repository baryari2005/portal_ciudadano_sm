import fs from "node:fs";
import QR from "qrcode";

// Media input only: Chrome/qr-scanner decode this actual QR normally.
const fixture=JSON.parse(fs.readFileSync(".tmp/qa-postgres/qr-decision.private.json"));
const userId=process.env.QA_QR_CAMERA_USER_ID ?? (process.env.QA_QR_BROWSER_OTHER_DAY?fixture.fixtures.users.find(u=>u.label==="other_day").id:fixture.fixtures.browserUserId);
const token=fixture.tokens[userId],qr=QR.create(token,{errorCorrectionLevel:"M"}).modules;
const width=640,height=480,scale=Math.floor(400/(qr.size+8)),dimension=(qr.size+8)*scale,ox=Math.floor((width-dimension)/2),oy=Math.floor((height-dimension)/2);
const y=Buffer.alloc(width*height,235),uv=Buffer.alloc(width*height/2,128);
for(let row=0;row<qr.size;row++)for(let col=0;col<qr.size;col++)if(qr.get(row,col))for(let sy=0;sy<scale;sy++)y.fill(16,(oy+(row+4)*scale+sy)*width+ox+(col+4)*scale,(oy+(row+4)*scale+sy)*width+ox+(col+5)*scale);
const frame=Buffer.concat([Buffer.from("FRAME\n"),y,uv]);
fs.writeFileSync(".tmp/qa-postgres/qr-manual-camera.y4m",Buffer.concat([Buffer.from("YUV4MPEG2 W640 H480 F5:1 Ip A1:1 C420jpeg\n"),...Array(15).fill(frame)]));
console.log(JSON.stringify({fakeCamera:true,qrModules:qr.size,width,height,tokenPrinted:false}));
