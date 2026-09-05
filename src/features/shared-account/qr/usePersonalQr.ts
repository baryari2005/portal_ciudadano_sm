"use client";

import { useCallback,useEffect,useRef,useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { citizenPost } from "@/features/citizen/services/citizen.service";
import { useAuth } from "@/stores/auth";

type QrResponse={token:string;credential:{status:"ACTIVO";issuedAt:string}};

const QR_OPTIONS={width:320,margin:2,errorCorrectionLevel:"H" as const,color:{dark:"#1D4F36",light:"#FFFFFF"}};

async function createCleanQr(token:string){return QRCode.toDataURL(token,QR_OPTIONS)}

async function createBrandedQr(token:string){const canvas=document.createElement("canvas");await QRCode.toCanvas(canvas,token,QR_OPTIONS);const logo=await new Promise<HTMLImageElement>((resolve,reject)=>{const image=new globalThis.Image();image.onload=()=>resolve(image);image.onerror=reject;image.src="/mobile/logo.png"});const context=canvas.getContext("2d");if(!context)throw new Error("No pudimos preparar el QR.");const backgroundSize=66,logoSize=54,center=canvas.width/2;context.fillStyle="#FFFFFF";context.fillRect(center-backgroundSize/2,center-backgroundSize/2,backgroundSize,backgroundSize);context.drawImage(logo,center-logoSize/2,center-logoSize/2,logoSize,logoSize);return canvas.toDataURL("image/png")}

export function usePersonalQr(){
  const user=useAuth(state=>state.user),requested=useRef(false);
  const[image,setImage]=useState(""),[mobileImage,setMobileImage]=useState(""),[issuedAt,setIssuedAt]=useState<string>(),[loading,setLoading]=useState(true),[error,setError]=useState(false),[expanded,setExpanded]=useState(false);
  const generate=useCallback(async()=>{setLoading(true);setError(false);try{const result=await citizenPost<QrResponse>("/qr/issue");const[brandedQr,cleanQr]=await Promise.all([createBrandedQr(result.token),createCleanQr(result.token)]);setImage(brandedQr);setMobileImage(cleanQr);setIssuedAt(result.credential.issuedAt)}catch{setImage("");setMobileImage("");setIssuedAt(undefined);setError(true);toast.error("No pudimos mostrar el QR de ingreso. Intentá generarlo nuevamente.")}finally{setLoading(false)}},[]);
  useEffect(()=>{if(requested.current)return;requested.current=true;void generate()},[generate]);
  const fullName=[user?.nombre,user?.apellido].filter(Boolean).join(" ")||user?.userId||"Usuario";
  const displayedImage=typeof window!=="undefined"&&window.matchMedia("(max-width: 767px)").matches?mobileImage||image:image;
  async function share(){try{const blob=await(await fetch(image)).blob();const file=new File([blob],"mi-qr-mas-san-miguel.png",{type:"image/png"});if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:"Mi QR MÁS San Miguel",files:[file]});return}await navigator.clipboard.writeText(image);toast.success("QR copiado para compartir.")}catch{toast.error("No pudimos compartir el QR.")}}
  function download(){const link=document.createElement("a");link.href=image;link.download="mi-qr-mas-san-miguel.png";link.click()}
  return{user,image:displayedImage,mobileImage,issuedAt,loading,error,expanded,setExpanded,fullName,generate,share,download};
}
