"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import QRCode from "qrcode";
import { QrCode,RefreshCw,ScanLine,ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminDetailActions,AdminDetailHeader,AdminDetailPanel,AdminPageShell,adminSecondaryButtonClass } from "@/components/shared/admin-patterns";
import { CatalogErrorState,CatalogLoadingState,CatalogPageHeader } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { citizenPost } from "../services/citizen.service";
type Response={token:string;credential:{status:"ACTIVO";issuedAt:string}};
export function CitizenQrPage(){
  const requested=useRef(false);const[image,setImage]=useState("");const[loading,setLoading]=useState(true);const[error,setError]=useState(false);
  const generateQr=useCallback(async()=>{setLoading(true);setError(false);try{const result=await citizenPost<Response>("/qr/issue");setImage(await QRCode.toDataURL(result.token,{width:320,margin:2,color:{dark:"#003A22",light:"#FFFFFF"}}))}catch{setImage("");setError(true);toast.error("No pudimos generar el QR de ingreso.")}finally{setLoading(false)}},[]);
  useEffect(()=>{if(requested.current)return;requested.current=true;void generateQr()},[generateQr]);
  if(loading)return <CatalogLoadingState label="credencial QR" fullPage/>;
  return <AdminPageShell><CatalogPageHeader icon={QrCode} title="Mi QR de ingreso" description="Generá una credencial digital para presentar en recepción." total={image?1:0}/>
    {error?<div className="mt-6"><CatalogErrorState message="No pudimos generar el QR. Revisá la conexión y volvé a intentarlo." onRetry={()=>void generateQr()}/></div>:<div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(360px,.95fr)_minmax(360px,1.05fr)]">
      <AdminDetailPanel className="grid min-h-[520px] place-items-center bg-white"><div className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white"><QrCode className="size-7"/></span><h2 className="mt-4 text-2xl font-extrabold text-[var(--brand-heading)]">Credencial digital activa</h2><p className="mt-1 text-sm font-medium text-[var(--brand-muted)]">Acercá este código al lector de recepción.</p><div className="mx-auto mt-5 inline-block rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-control)] p-4 shadow-sm"><img src={image} alt="QR digital de ingreso" className="size-60 sm:size-72"/></div></div></AdminDetailPanel>
      <AdminDetailPanel><AdminDetailHeader title="Listo para presentar" subtitle="Estado de la credencial" leading={<span className="grid size-14 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white"><ShieldCheck className="size-7"/></span>}/><div className="mt-6 grid gap-3"><Info icon={ScanLine} title="Un solo intento">Recepción invalidará este QR después de escanearlo, tanto si el ingreso es autorizado como si es rechazado.</Info><Info icon={RefreshCw} title="Siempre usá el más reciente">Si generás uno nuevo, esta credencial dejará de funcionar inmediatamente.</Info></div><AdminDetailActions><Button variant="outline" className={adminSecondaryButtonClass} onClick={()=>void generateQr()}><RefreshCw/>Generar un nuevo QR</Button></AdminDetailActions></AdminDetailPanel>
    </div>}
  </AdminPageShell>;
}
function Info({icon:Icon,title,children}:{icon:typeof ScanLine;title:string;children:React.ReactNode}){return <div className="flex gap-3 rounded-2xl border border-[var(--brand-border)] bg-white/60 p-4"><Icon className="mt-0.5 size-5 shrink-0 text-[var(--brand-primary)]"/><div><p className="font-extrabold text-[var(--brand-ink)]">{title}</p><p className="mt-1 text-sm font-medium leading-5 text-[var(--brand-muted)]">{children}</p></div></div>}
