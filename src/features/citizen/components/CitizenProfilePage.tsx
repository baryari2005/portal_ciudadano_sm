"use client";

import { useEffect, useState } from "react";
import { AtSign, CalendarDays, FileText, Loader2, Mail, Save, User, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconInput } from "@/components/forms/IconInput";
import { PhoneInput } from "@/components/forms/PhoneInput";
import { GoogleAddressInput } from "@/components/forms/GoogleAddressInput";
import { MedicalCoverageSelect } from "@/features/medical-coverages/components/MedicalCoverageSelect";
import { UserAvatar } from "@/components/layout/user-menu/UserAvatar";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { RequestAccessPhotoField } from "@/features/auth/request-access/components/RequestAccessPhotoField";
import { useAvatarStaging } from "@/features/users/hooks/useAvatarStaging";
import { pathFromPublicUrl } from "@/features/users/lib/utils";
import { changeMyAvatar } from "@/lib/api/account";
import { isValidPhone, PHONE_VALIDATION_MESSAGE } from "@/lib/validation/phone";
import { useAuth } from "@/stores/auth";
import { citizenPatch } from "../services/citizen.service";
import { useCitizenData } from "./CitizenPrimitives";

type CitizenProfile = { id:string;userId:string;nombre:string|null;apellido:string|null;documento:string|null;email:string;celular:string|null;domicilio:string|null;domicilioPlaceId:string|null;domicilioLat:number|null;domicilioLng:number|null;fechaNacimiento:string|null;avatarUrl:string|null;fotoPerfilUrl:string|null;contactoEmergenciaNombre:string|null;contactoEmergenciaTelefono:string|null;coberturaMedicaId:string|null;numeroAfiliado:string|null };
type ProfileForm = { firstName:string;lastName:string;phone:string;address:string;addressPlaceId:string|null;addressLat:number|null;addressLng:number|null;birthDate:string;emergencyContactName:string;emergencyContactPhone:string;medicalCoverageId:string|null;affiliateNumber:string };
const emptyForm:ProfileForm={firstName:"",lastName:"",phone:"",address:"",addressPlaceId:null,addressLat:null,addressLng:null,birthDate:"",emergencyContactName:"",emergencyContactPhone:"",medicalCoverageId:null,affiliateNumber:""};
const inputClass="h-11 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9 font-medium text-[#173C2A]";
const readOnlyClass=`${inputClass} cursor-not-allowed bg-[#EEF2EA] text-[#5F6F68] opacity-100`;
const titleCase=(value:string)=>value.toLowerCase().trim().replace(/\s+/g," ").replace(/(^|[\s'-])([a-záéíóúüñ])/g,(_,prefix:string,letter:string)=>prefix+letter.toUpperCase());

export function CitizenProfilePage(){
  const{data,setData,loading,error,retry}=useCitizenData<CitizenProfile>("/profile");
  const[form,setForm]=useState<ProfileForm>(emptyForm);
  const[saving,setSaving]=useState(false);
  const{tmpPath:avatarTmpPath,setTmpPath:setAvatarTmpPath,commit:commitAvatar}=useAvatarStaging();
  const{tmpPath:identityTmpPath,setTmpPath:setIdentityTmpPath,commit:commitIdentity}=useAvatarStaging();
  const fetchMe=useAuth(state=>state.fetchMe);

  useEffect(()=>{if(data)setForm({firstName:data.nombre??"",lastName:data.apellido??"",phone:data.celular??"",address:data.domicilio??"",addressPlaceId:data.domicilioPlaceId,addressLat:data.domicilioLat,addressLng:data.domicilioLng,birthDate:data.fechaNacimiento?String(data.fechaNacimiento).slice(0,10):"",emergencyContactName:data.contactoEmergenciaNombre??"",emergencyContactPhone:data.contactoEmergenciaTelefono??"",medicalCoverageId:data.coberturaMedicaId,affiliateNumber:data.numeroAfiliado??""})},[data]);
  const setValue=(field:keyof ProfileForm,value:string)=>setForm(current=>({...current,[field]:value}));

  async function save(){
    if(!data)return;
    if(!form.firstName.trim()||!form.lastName.trim()||!form.address.trim()||!form.birthDate||!form.emergencyContactName.trim()){toast.error("Completá todos los datos personales y de emergencia.");return}
    if(!isValidPhone(form.phone)){toast.error(PHONE_VALIDATION_MESSAGE);return}
    if(!isValidPhone(form.emergencyContactPhone)){toast.error("Ingresá un teléfono de emergencia válido.");return}
    setSaving(true);
    try{let profilePhotoUrl:string|undefined;if(identityTmpPath){const committed=await commitIdentity(`identity-photos/${data.id}`,pathFromPublicUrl(data.fotoPerfilUrl));profilePhotoUrl=committed.publicUrl}let updated=await citizenPatch<CitizenProfile>("/profile",{...form,firstName:titleCase(form.firstName),lastName:titleCase(form.lastName),address:titleCase(form.address),...(profilePhotoUrl?{profilePhotoUrl}:{})});if(avatarTmpPath){const committed=await commitAvatar(`users/${data.id}`,pathFromPublicUrl(data.avatarUrl));await changeMyAvatar({avatarUrl:committed.publicUrl});updated={...updated,avatarUrl:committed.publicUrl}}setData(updated);await fetchMe(true);toast.success("Perfil actualizado.")}
    catch{toast.error("No pudimos actualizar tu perfil.")}
    finally{setSaving(false)}
  }

  if(loading)return <CatalogLoadingState label="perfil" fullPage/>;
  if(error||!data)return <main className="grid min-h-[calc(100dvh-var(--topbar-h)-48px)] place-items-center bg-[#F7FBF5] p-8"><div className="rounded-3xl border border-[#DDE8D7] bg-white p-8 text-center"><p className="font-bold text-[#1D4F36]">No pudimos cargar tu perfil.</p><Button variant="outline" className="mt-4" onClick={retry}>Reintentar</Button></div></main>;

  const fullName=[data.nombre,data.apellido].filter(Boolean).join(" ")||"Ciudadano";
  return <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[#F7FBF5] p-4 sm:p-6 lg:p-8">
    <header><h1 className="text-3xl font-bold tracking-tight text-[#1D4F36] sm:text-4xl">Mi perfil</h1><p className="mt-2 max-w-2xl text-sm text-[#315644]/80 sm:text-base">Consultá y mantené actualizada tu información personal.</p></header>
    <section className="mt-6 rounded-3xl border border-[#819B56]/20 bg-white/80 p-5 text-[#173C2A] shadow-sm sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 border-b border-[#C9D9C3] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-extrabold text-[#003A22]">Datos del usuario</h2><p className="mt-1 text-sm font-medium text-[#5F6F68]">Información registrada en tu cuenta del Portal Ciudadano.</p></div>
        <div className="flex items-center gap-3 rounded-2xl bg-[#EEF6E9] p-3"><UserAvatar src={data.avatarUrl??undefined} name={fullName} className="size-14 rounded-xl" fallbackBgClass="rounded-xl bg-[#1D4F36]" textClass="font-bold text-white"/><div className="min-w-0"><p className="truncate font-extrabold text-[#1D4F36]">{fullName}</p><p className="truncate text-xs font-medium text-[#5F6F68]">Avatar visible en el portal</p></div></div>
      </div>

      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Field label="Nombre *"><IconInput id="profile-first-name" leftIcon={<User className="size-4 text-[#1D4F36]"/>} input={<Input id="profile-first-name" value={form.firstName} onChange={event=>setValue("firstName",event.target.value)} onBlur={()=>setValue("firstName",titleCase(form.firstName))} className={inputClass}/>}/></Field>
        <Field label="Apellido *"><IconInput id="profile-last-name" leftIcon={<UserRound className="size-4 text-[#1D4F36]"/>} input={<Input id="profile-last-name" value={form.lastName} onChange={event=>setValue("lastName",event.target.value)} onBlur={()=>setValue("lastName",titleCase(form.lastName))} className={inputClass}/>}/></Field>
        <Field label="DNI"><IconInput id="profile-document" leftIcon={<FileText className="size-4 text-[#1D4F36]"/>} input={<Input id="profile-document" value={data.documento??""} readOnly aria-readonly className={readOnlyClass}/>}/><Hint>Dato de identidad. Para corregirlo, contactá a un administrador.</Hint></Field>
        <Field label="Fecha de nacimiento *"><IconInput id="profile-birth-date" leftIcon={<CalendarDays className="size-4 text-[#1D4F36]"/>} input={<Input id="profile-birth-date" type="date" value={form.birthDate} max={new Date().toISOString().slice(0,10)} onChange={event=>setValue("birthDate",event.target.value)} className={inputClass}/>}/></Field>
        <Field label="Dirección *" className="sm:col-span-2"><GoogleAddressInput id="profile-address" value={form.address} placeId={form.addressPlaceId} onChange={(location)=>setForm(current=>({...current,address:location.address,addressPlaceId:location.placeId,addressLat:location.lat,addressLng:location.lng}))} className={inputClass} placeholder="Ej: Av. Presidente Perón 1234"/></Field>
        <Field label="Email"><IconInput id="profile-email" leftIcon={<Mail className="size-4 text-[#1D4F36]"/>} input={<Input id="profile-email" value={data.email} readOnly aria-readonly className={readOnlyClass}/>}/><Hint>Podés cambiarlo desde el menú de usuario.</Hint></Field>
        <Field label="Teléfono *"><PhoneInput id="profile-phone" value={form.phone} onChange={value=>setValue("phone",value)} className={inputClass} required/></Field>
        <Field label="Persona de contacto de emergencia *"><Input value={form.emergencyContactName} onChange={event=>setValue("emergencyContactName",event.target.value)} className={inputClass.replace("pl-9","")} placeholder="Nombre y apellido"/></Field>
        <Field label="Teléfono de emergencia *"><PhoneInput id="profile-emergency-phone" value={form.emergencyContactPhone} onChange={value=>setValue("emergencyContactPhone",value)} className={inputClass} required/></Field>
        <Field label="Obra social o prepaga"><MedicalCoverageSelect value={form.medicalCoverageId} onChange={medicalCoverageId=>setForm(current=>({...current,medicalCoverageId}))}/></Field>
        <Field label="Número de afiliado"><Input value={form.affiliateNumber} onChange={event=>setValue("affiliateNumber",event.target.value)} className={inputClass.replace("pl-9","")}/></Field>
      </div>

      <div className="mt-6">
        <RequestAccessPhotoField
          currentUrl={data.avatarUrl}
          disabled={saving}
          allowClear={false}
          title="Avatar"
          description="Elegí la imagen que querés mostrar en todo el portal. No modifica tu foto de identidad."
          allowCamera={false}
          onUploaded={({ tmpPath: uploadedPath }) => setAvatarTmpPath(uploadedPath)}
          onClear={() => setAvatarTmpPath(null)}
        />
      </div>

      <div className="mt-6"><RequestAccessPhotoField currentUrl={data.fotoPerfilUrl} disabled={saving} allowClear={false} title="Foto de identidad" description="Tomá una foto clara y actual. Recepción la usará para comparar tu identidad al escanear el QR." onUploaded={({tmpPath:uploadedPath})=>setIdentityTmpPath(uploadedPath)} onClear={()=>setIdentityTmpPath(null)}/></div>

      <div className="mt-6 space-y-4 border-t border-[#D7E0D8] pt-6"><div><p className="text-sm font-bold uppercase tracking-normal text-[#1D4F36]">Datos de acceso</p><p className="mt-1 text-sm text-[#5F6F68]">Identificador utilizado para ingresar al sistema.</p></div><div className="max-w-[calc(50%-1rem)] max-sm:max-w-none"><Field label="User ID"><IconInput id="profile-user-id" leftIcon={<AtSign className="size-4 text-[#1D4F36]"/>} input={<Input id="profile-user-id" value={data.userId} readOnly aria-readonly className={readOnlyClass}/>}/></Field></div></div>
    </section>
    <div className="mt-6 flex justify-end"><Button size="lg" className="h-12 w-full rounded-xl bg-[#014D31] px-8 text-base font-bold text-white shadow-sm hover:bg-[#003A22] sm:w-auto" disabled={saving} onClick={()=>void save()}>{saving?<><Loader2 className="size-5 animate-spin"/>Guardando...</>:<><Save className="size-5"/>Guardar cambios</>}</Button></div>
  </main>;
}

function Field({label,children,className=""}:{label:string;children:React.ReactNode;className?:string}){return <div className={`space-y-1 ${className}`}><Label className="font-extrabold text-[#173C2A]">{label}</Label>{children}</div>}
function Hint({children}:{children:React.ReactNode}){return <p className="text-xs font-medium text-[#5F6F68]">{children}</p>}
