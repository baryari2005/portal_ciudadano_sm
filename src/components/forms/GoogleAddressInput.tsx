"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

export type GoogleAddressValue={address:string;placeId:string|null;lat:number|null;lng:number|null;locality?:string;province?:string;postalCode?:string};
type Props={id:string;value:string;placeId?:string|null;onChange:(value:GoogleAddressValue)=>void;className?:string;disabled?:boolean;placeholder?:string};
declare global{interface Window{google?:any;__googleMapsPromise?:Promise<void>}}

function loadGoogleMaps(key:string){if(window.google?.maps?.importLibrary)return Promise.resolve();if(window.__googleMapsPromise)return window.__googleMapsPromise;window.__googleMapsPromise=new Promise<void>((resolve,reject)=>{const callback=`__googleMapsReady_${Date.now()}`;(window as any)[callback]=()=>{delete(window as any)[callback];resolve()};const script=document.createElement("script");script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&v=weekly&language=es&region=AR&auth_referrer_policy=origin&callback=${callback}`;script.async=true;script.onerror=()=>reject(new Error("No se pudo cargar Google Maps"));document.head.appendChild(script)});return window.__googleMapsPromise}

export function GoogleAddressInput({id,value,placeId,onChange,className,disabled,placeholder}:Props){
  const hostRef=useRef<HTMLDivElement|null>(null),widgetRef=useRef<any>(null),callbackRef=useRef(onChange);callbackRef.current=onChange;
  const apiKey=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const[mode,setMode]=useState<"loading"|"google"|"manual">(apiKey?"loading":"manual");

  useEffect(()=>{if(!apiKey||!hostRef.current)return;let active=true,widget:any;void loadGoogleMaps(apiKey).then(async()=>{const places=await window.google.maps.importLibrary("places");if(!active||!hostRef.current)return;widget=new places.PlaceAutocompleteElement({includedRegionCodes:["ar"],requestedLanguage:"es",requestedRegion:"ar"});widget.id=id;widget.placeholder=placeholder??"Ingresá una dirección";widget.value=value;widget.disabled=Boolean(disabled);widget.noInputIcon=true;widget.className="google-address-autocomplete";widget.addEventListener("input",()=>callbackRef.current({address:String(widget.value??""),placeId:null,lat:null,lng:null}));widget.addEventListener("gmp-select",async(event:any)=>{const place=event.placePrediction.toPlace();await place.fetchFields({fields:["id","formattedAddress","location"]});const location=place.location;callbackRef.current({address:place.formattedAddress||String(widget.value??""),placeId:place.id||null,lat:location?.lat()??null,lng:location?.lng()??null})});widget.addEventListener("gmp-error",()=>setMode("manual"));hostRef.current.replaceChildren(widget);widgetRef.current=widget;setMode("google")}).catch(()=>setMode("manual"));return()=>{active=false;widget?.remove?.();widgetRef.current=null}},[apiKey,id,placeholder]);
  useEffect(()=>{if(widgetRef.current&&widgetRef.current.value!==value)widgetRef.current.value=value},[value]);
  useEffect(()=>{if(widgetRef.current)widgetRef.current.disabled=Boolean(disabled)},[disabled]);

  const manual=<div className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--brand-primary)]"/><Input id={id} value={value} disabled={disabled} onChange={event=>onChange({address:event.target.value,placeId:null,lat:null,lng:null})} className={className} placeholder={placeholder}/></div>;
  return <div>{mode==="manual"?manual:<div className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--brand-primary)]"/><div ref={hostRef} className={mode==="loading"?"min-h-11 animate-pulse rounded-xl bg-[var(--brand-panel)]":""}/></div>}{placeId?<p className="mt-1 flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)]"><CheckCircle2 className="size-3.5"/>Dirección validada por Google</p>:mode==="manual"?<p className="mt-1 text-xs font-medium text-[var(--brand-muted)]">Ingreso manual disponible.</p>:<p className="mt-1 text-xs font-medium text-[var(--brand-muted)]">Seleccioná una sugerencia para validar la dirección.</p>}</div>
}
