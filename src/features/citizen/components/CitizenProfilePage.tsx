"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, CakeSlice, CalendarIcon, CheckCircle2, ChevronRight, Contact, HeartPulse, IdCard, Images, KeyRound, Loader2, Mail, Map, MapPin, MapPinned, Save, ShieldPlus, Trash2, User, UserCog, UserRound } from "lucide-react";
import { toast } from "sonner";

import { AdminFormHeader } from "@/components/layout/admin-form-page";
import { ChangePasswordDialog } from "@/components/layout/user-menu/ChangePasswordDialog";
import { AdminFormViewToggle } from "@/components/shared/admin-form-view-toggle";
import { AdminWorkflowLayout } from "@/components/shared/admin-workflow-layout";
import { AdminFormCard, adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/components/shared/admin-patterns";
import { GoogleAddressInput } from "@/components/forms/GoogleAddressInput";
import { IconInput } from "@/components/forms/IconInput";
import { PhoneInput } from "@/components/forms/PhoneInput";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ARGENTINA_PROVINCES } from "@/constants/argentina-locations";
import { GENERO_OPCIONES, type Genero } from "@/constants/genero";
import { NACIONALIDAD_VALUES, type Nacionalidad } from "@/constants/nacionalidad";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { RequestAccessPhotoField } from "@/features/auth/request-access/components/RequestAccessPhotoField";
import { MedicalCoverageSelect } from "@/features/medical-coverages/components/MedicalCoverageSelect";
import { useAvatarStaging } from "@/features/users/hooks/useAvatarStaging";
import { fromYmdLocal, toYmdLocal } from "@/features/users/lib/user-form.helpers";
import { pathFromPublicUrl } from "@/features/users/lib/utils";
import { deleteUserDraft, getUserDraft, saveUserDraft, type DraftStepStatus } from "@/features/users/services/user-drafts.service";
import { changeMyAvatar } from "@/lib/api/account";
import { isValidPhone, PHONE_VALIDATION_MESSAGE } from "@/lib/validation/phone";
import { useAuth } from "@/stores/auth";
import { citizenPatch } from "../services/citizen.service";
import { useCitizenData } from "./CitizenPrimitives";
import { CitizenMobileProfile } from "./mobile/CitizenMobileProfile";
import type { PersonalProfile } from "@/features/shared-account/profile/personal-profile.types";

type ProfileForm = { firstName: string; lastName: string; phone: string; address: string; locality: string; province: string; postalCode: string; addressPlaceId: string | null; addressLat: number | null; addressLng: number | null; birthDate: string; nationality: Nacionalidad | ""; gender: Genero | ""; emergencyContactName: string; emergencyContactPhone: string; medicalCoverageId: string | null; affiliateNumber: string };

const emptyForm: ProfileForm = { firstName: "", lastName: "", phone: "", address: "", locality: "", province: "", postalCode: "", addressPlaceId: null, addressLat: null, addressLng: null, birthDate: "", nationality: "", gender: "", emergencyContactName: "", emergencyContactPhone: "", medicalCoverageId: null, affiliateNumber: "" };
const controlClass = "h-11 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 font-medium text-[var(--brand-ink)]";
const readOnlyClass = `${controlClass} cursor-not-allowed bg-[var(--brand-panel)] opacity-100`;
const initialStatuses: Record<number, DraftStepStatus> = { 1: "pending", 2: "pending", 3: "pending", 4: "pending", 5: "pending", 6: "pending" };
const sections = [
  { id: 1, label: "Datos personales", icon: UserRound },
  { id: 2, label: "Datos de acceso", icon: KeyRound },
  { id: 3, label: "Domicilio", icon: MapPin },
  { id: 4, label: "Contacto", icon: ShieldPlus },
  { id: 5, label: "Cobertura", icon: CheckCircle2 },
  { id: 6, label: "Imágenes", icon: Images },
];
const sectionMeta = [
  ["Datos personales", "Identidad, fecha de nacimiento y datos demográficos."],
  ["Datos de acceso", "Usuario y contraseña de acceso."],
  ["Domicilio", "Dirección, localidad, provincia y código postal."],
  ["Contacto", "Datos de contacto y referencia de emergencia."],
  ["Cobertura médica", "Obra social o prepaga y número de afiliado."],
  ["Imágenes", "Avatar del portal y foto para comprobar la identidad."],
] as const;
const fieldSection: Partial<Record<keyof ProfileForm, number>> = { firstName: 1, lastName: 1, birthDate: 1, nationality: 1, gender: 1, address: 3, locality: 3, province: 3, postalCode: 3, addressPlaceId: 3, addressLat: 3, addressLng: 3, phone: 4, emergencyContactName: 4, emergencyContactPhone: 4, medicalCoverageId: 5, affiliateNumber: 5 };
const titleCase = (value: string) => value.toLowerCase().trim().replace(/\s+/g, " ").replace(/(^|[\s'-])([a-záéíóúüñ])/g, (_, prefix: string, letter: string) => prefix + letter.toUpperCase());

type MobileProfileRenderer=(props:{data:PersonalProfile;onEdit:()=>void;onChangePassword:()=>void})=>React.ReactNode;
export function PersonalProfilePage({ workspace = "citizen",renderMobileProfile }: { workspace?: "citizen" | "reception" | "teacher";renderMobileProfile?:MobileProfileRenderer } = {}) {
  const { data, setData, loading, error, retry } = useCitizenData<PersonalProfile>("/profile");
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [section, setSection] = useState(1);
  const [viewMode, setViewMode] = useState<"workflow" | "full">("full");
  const [stepStatus, setStepStatus] = useState<Record<number, DraftStepStatus>>(initialStatuses);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string>();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [mobileEditing, setMobileEditing] = useState(false);
  const loadedDraftFor = useRef<string | undefined>(undefined);
  const { tmpPath: avatarTmpPath, setTmpPath: setAvatarTmpPath, commit: commitAvatar } = useAvatarStaging();
  const { tmpPath: identityTmpPath, setTmpPath: setIdentityTmpPath, commit: commitIdentity } = useAvatarStaging();
  const fetchMe = useAuth((state) => state.fetchMe);
  const workflow = viewMode === "workflow";
  const usesMobileProfile = workspace === "citizen" || workspace === "teacher" || Boolean(renderMobileProfile);
  const mobileOnlyClass = workspace === "teacher" || workspace === "reception" ? "md:hidden" : "lg:hidden";
  const desktopOnlyClass = workspace === "teacher" || workspace === "reception" ? "hidden md:block" : "hidden lg:block";
  const mobileNavigationHeight = workspace === "teacher" ? "calc(72px + env(safe-area-inset-bottom))" : "var(--citizen-mobile-nav-h)";
  const show = (number: number) => !workflow || section === number;

  useEffect(() => {
    if (!data || loadedDraftFor.current === data.id) return;
    loadedDraftFor.current = data.id;
    const base = { firstName: data.nombre ?? "", lastName: data.apellido ?? "", phone: data.celular ?? "", address: data.domicilio ?? "", locality: data.localidad ?? "", province: data.provincia ?? "", postalCode: data.codigoPostal ?? "", addressPlaceId: data.domicilioPlaceId, addressLat: data.domicilioLat, addressLng: data.domicilioLng, birthDate: data.fechaNacimiento ? String(data.fechaNacimiento).slice(0, 10) : "", nationality: data.nacionalidad ?? "", gender: data.genero ?? "", emergencyContactName: data.contactoEmergenciaNombre ?? "", emergencyContactPhone: data.contactoEmergenciaTelefono ?? "", medicalCoverageId: data.coberturaMedicaId, affiliateNumber: data.numeroAfiliado ?? "" } satisfies ProfileForm;
    setForm(base);
    void getUserDraft<Record<string, unknown>>("profile", "edit", data.id).then((draft) => {
      if (!draft) return;
      const { __identityTmpPath, __avatarTmpPath, ...payload } = draft.payload;
      setDraftId(draft.id); setSection(draft.currentStep); setViewMode(draft.viewMode); setStepStatus(draft.stepStatuses); setForm({ ...base, ...payload } as ProfileForm);
      if (typeof __identityTmpPath === "string") setIdentityTmpPath(__identityTmpPath);
      if (typeof __avatarTmpPath === "string") setAvatarTmpPath(__avatarTmpPath);
      toast.info("Recuperamos el último borrador guardado.");
    }).catch(() => undefined);
  }, [data, setAvatarTmpPath, setIdentityTmpPath]);

  const markUnsaved = (number: number) => setStepStatus((current) => ({ ...current, [number]: "unsaved" }));
  const setValue = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(["locality", "province", "postalCode"].includes(field)
        ? { addressPlaceId: null, addressLat: null, addressLng: null }
        : {}),
    }));
    markUnsaved(fieldSection[field] ?? section);
  };
  const age = form.birthDate ? Math.max(0, new Date(Date.now() - fromYmdLocal(form.birthDate).getTime()).getUTCFullYear() - 1970) : null;

  function isSectionValid(number: number) {
    if (number === 1) return Boolean(form.firstName.trim() && form.lastName.trim() && form.birthDate && form.nationality && form.gender);
    if (number === 3) return Boolean(form.address.trim() && form.locality.trim() && form.province && form.postalCode.trim() && form.addressPlaceId && form.addressLat != null && form.addressLng != null);
    if (number === 4) return Boolean(isValidPhone(form.phone) && form.emergencyContactName.trim() && isValidPhone(form.emergencyContactPhone));
    return true;
  }

  async function persistDraft(statuses: Record<number, DraftStepStatus>, currentStep = section) {
    if (!data) return;
    setSavingDraft(true);
    try {
      const draft = await saveUserDraft({ id: draftId, scope: "profile", mode: "edit", subjectUserId: data.id, payload: { ...(form as unknown as Record<string, unknown>), __identityTmpPath: identityTmpPath, __avatarTmpPath: avatarTmpPath }, currentStep, stepStatuses: statuses, viewMode });
      setDraftId(draft.id); setStepStatus(draft.stepStatuses); toast.success("Borrador guardado.");
    } catch { toast.error("No pudimos guardar el borrador."); throw new Error("DRAFT_SAVE_FAILED"); }
    finally { setSavingDraft(false); }
  }

  async function saveDraft() {
    const statuses = { ...stepStatus };
    if (workflow) statuses[section] = isSectionValid(section) ? "valid" : "invalid";
    else sections.forEach(({ id }) => { statuses[id] = isSectionValid(id) ? "valid" : "invalid"; });
    try { await persistDraft(statuses); } catch {}
  }

  async function continueToNextStep() {
    const valid = isSectionValid(section);
    const statuses = { ...stepStatus, [section]: valid ? "valid" as const : "invalid" as const };
    setStepStatus(statuses);
    if (!valid) { toast.error("Corregí los campos marcados antes de continuar."); return; }
    const next = Math.min(6, section + 1);
    try { await persistDraft(statuses, next); setSection(next); } catch {}
  }

  async function save() {
    if (!data) return;
    if (!form.nationality || !form.gender || !form.firstName.trim() || !form.lastName.trim() || !form.birthDate) { setSection(1); toast.error("Completá todos los datos personales."); return; }
    if (!form.address.trim() || !form.locality.trim() || !form.province || !form.postalCode.trim()) { setSection(3); toast.error("Completá todos los datos del domicilio."); return; }
    if (!form.addressPlaceId || form.addressLat == null || form.addressLng == null) { setSection(3); toast.error("Buscá la dirección y seleccioná una ubicación válida en el mapa."); return; }
    if (!isValidPhone(form.phone)) { setSection(4); toast.error(PHONE_VALIDATION_MESSAGE); return; }
    if (!form.emergencyContactName.trim() || !isValidPhone(form.emergencyContactPhone)) { setSection(4); toast.error("Completá correctamente el contacto de emergencia."); return; }
    setSaving(true);
    try {
      let profilePhotoUrl: string | undefined;
      if (identityTmpPath) { const committed = await commitIdentity(`identity-photos/${data.id}`, pathFromPublicUrl(data.fotoPerfilUrl)); profilePhotoUrl = committed.publicUrl; }
      let updated = await citizenPatch<PersonalProfile>("/profile", { ...form, firstName: titleCase(form.firstName), lastName: titleCase(form.lastName), address: titleCase(form.address), ...(profilePhotoUrl ? { profilePhotoUrl } : {}) });
      if (avatarTmpPath) { const committed = await commitAvatar(`users/${data.id}`, pathFromPublicUrl(data.avatarUrl)); await changeMyAvatar({ avatarUrl: committed.publicUrl }); updated = { ...updated, avatarUrl: committed.publicUrl }; }
      setData(updated); if (draftId) await deleteUserDraft(draftId); setDraftId(undefined); setStepStatus({ 1: "valid", 2: "valid", 3: "valid", 4: "valid", 5: "valid", 6: "valid" }); await fetchMe(true); setMobileEditing(false); toast.success("Perfil actualizado.");
    } catch { toast.error("No pudimos actualizar tu perfil."); }
    finally { setSaving(false); }
  }

  async function discardDraft() { if (!draftId) return; await deleteUserDraft(draftId); window.location.reload(); }

  if (loading) return <CatalogLoadingState label="perfil" fullPage />;
  if (error || !data) return <div className="grid min-h-[calc(100dvh-var(--topbar-h)-48px)] place-items-center bg-[var(--brand-page)] p-6"><AdminFormCard title="No pudimos cargar tu perfil."><Button variant="outline" onClick={retry}>Reintentar</Button></AdminFormCard></div>;

  const meta = workflow ? sectionMeta[section - 1] : ["Datos del usuario", "Información disponible para mantener actualizado tu perfil."] as const;
  const backHref = workspace === "reception" ? "/reception" : workspace === "teacher" ? "/teacher" : "/citizen";
  const actions = <div className={`${usesMobileProfile && mobileEditing ? workspace === "teacher" ? "hidden md:flex" : "hidden lg:flex" : "flex"} mt-8 flex-col-reverse gap-3 border-t border-[var(--brand-border)] pt-5 sm:flex-row sm:flex-wrap sm:justify-between`}>
    {workflow && section > 1 ? <Button type="button" variant="outline" className={`${adminSecondaryButtonClass} w-full justify-center gap-3 sm:w-auto`} onClick={() => setSection((current) => current - 1)}><ArrowLeft className="size-5" />Anterior</Button> : <Button asChild type="button" variant="outline" className={`${adminSecondaryButtonClass} w-full justify-center gap-3 sm:w-auto`}><Link href={backHref}><ArrowLeft className="size-5" />Volver</Link></Button>}
    <div className="flex flex-col gap-3 sm:flex-row">
      {draftId ? <Button type="button" variant="ghost" className="h-12 gap-2 rounded-xl text-red-700 hover:bg-red-50" disabled={savingDraft || saving} onClick={() => void discardDraft()}><Trash2 />Descartar borrador</Button> : null}
      <Button type="button" variant="outline" className={`${adminSecondaryButtonClass} w-full justify-center gap-3 sm:w-auto`} disabled={savingDraft || saving} onClick={() => void saveDraft()}>{savingDraft ? <Loader2 className="animate-spin" /> : <Save />}Guardar borrador</Button>
      {workflow && section < 6 ? <Button type="button" className={`${adminPrimaryButtonClass} w-full justify-center gap-3 sm:w-auto`} disabled={savingDraft || saving} onClick={() => void continueToNextStep()}>Guardar y continuar<ChevronRight className="size-5" /></Button> : <Button type="button" className={`${adminPrimaryButtonClass} w-full justify-center gap-3 sm:w-auto`} disabled={savingDraft || saving} onClick={() => void save()}>{saving ? <Loader2 className="animate-spin" /> : null}Guardar cambios<Save /></Button>}
    </div>
  </div>;
  const mobileEditActions = usesMobileProfile && mobileEditing ? <footer className={`fixed inset-x-0 bottom-[var(--mobile-profile-nav-h)] z-30 grid grid-cols-2 gap-2 border-t border-[var(--brand-border-soft)] bg-[#F9FAF5]/95 p-3 shadow-[0_-8px_24px_rgba(29,79,54,0.10)] backdrop-blur ${mobileOnlyClass}`} style={{ "--mobile-profile-nav-h": mobileNavigationHeight } as React.CSSProperties}><Button type="button" variant="outline" className="h-8 rounded-lg border-[var(--brand-primary)] bg-transparent px-2 text-xs font-bold text-[var(--brand-primary)]" disabled={savingDraft || saving} onClick={() => void saveDraft()}>{savingDraft ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}Guardar borrador</Button><Button type="button" className="h-8 rounded-lg bg-[var(--brand-primary)] px-2 text-xs font-bold hover:bg-[var(--brand-primary-hover)]" disabled={savingDraft || saving} onClick={() => void save()}>{saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}Guardar cambios</Button></footer> : null;
  const mobileEditor = usesMobileProfile && mobileEditing ? <main className={`min-h-full bg-[var(--brand-page)] px-3 pb-[calc(var(--mobile-profile-nav-h)+88px)] pt-4 ${mobileOnlyClass}`} style={{ "--mobile-profile-nav-h": mobileNavigationHeight } as React.CSSProperties}>
    <header className="mb-4 flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-panel)] text-[var(--brand-primary)]"><UserCog className="size-6" /></span><div><h1 className="text-2xl font-extrabold text-[var(--brand-primary)]">Mi perfil</h1><p className="mt-1 text-xs leading-5 text-[var(--brand-muted)]">Consultá y mantené actualizada tu información personal.</p></div></header>
    <AdminFormViewToggle value={viewMode} onChange={setViewMode} compactOnMobile />
    {workflow ? <nav className="mb-3 flex gap-2 overflow-x-auto pb-1">{sections.map(({id,label})=><button key={id} type="button" onClick={()=>setSection(id)} className={`${section===id?"bg-[var(--brand-primary)] text-white":"border border-[var(--brand-border-soft)] bg-[#F9FAF5] text-[var(--brand-primary)]"} shrink-0 rounded-lg px-3 py-2 text-xs font-bold`}>{id}. {label}</button>)}</nav> : null}
    <div className="space-y-3">
      {show(1) ? <MobileEditCard number={1} title="Datos personales"><div className="grid grid-cols-2 gap-3"><Field label="Nombre *"><IconInput id="mobile-profile-first-name" leftIcon={<User className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.firstName} onChange={(event)=>setValue("firstName",event.target.value)} className={controlClass}/>} /></Field><Field label="Apellido *"><IconInput id="mobile-profile-last-name" leftIcon={<UserRound className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.lastName} onChange={(event)=>setValue("lastName",event.target.value)} className={controlClass}/>} /></Field><Field label="DNI"><IconInput id="mobile-profile-document" leftIcon={<IdCard className="size-4 text-[var(--brand-primary)]" />} input={<Input value={data.documento??""} readOnly className={readOnlyClass}/>} /></Field><Field label="Fecha de nacimiento *"><Input type="date" value={form.birthDate} onChange={(event)=>setValue("birthDate",event.target.value)} className={controlClass}/></Field><Field label="Edad"><IconInput id="mobile-profile-age" leftIcon={<CakeSlice className="size-4 text-[var(--brand-primary)]" />} input={<Input value={age===null?"Automática":`${age} años`} readOnly className={readOnlyClass}/>} /></Field><Field label="Nacionalidad *"><Select value={form.nationality} onValueChange={(value:Nacionalidad)=>setValue("nationality",value)}><SelectTrigger className={controlClass}><SelectValue placeholder="Seleccionar"/></SelectTrigger><SelectContent>{NACIONALIDAD_VALUES.map(item=><SelectItem key={item} value={item}>{item.replaceAll("_"," ")}</SelectItem>)}</SelectContent></Select></Field><Field label="Sexo / género *"><Select value={form.gender} onValueChange={(value:Genero)=>setValue("gender",value)}><SelectTrigger className={controlClass}><SelectValue placeholder="Seleccionar"/></SelectTrigger><SelectContent>{GENERO_OPCIONES.map(item=><SelectItem key={item} value={item}>{item.replaceAll("_"," ")}</SelectItem>)}</SelectContent></Select></Field><Field label="User ID"><IconInput id="mobile-profile-user-id" leftIcon={<User className="size-4 text-[var(--brand-primary)]" />} input={<Input value={data.userId} readOnly className={readOnlyClass}/>} /></Field></div></MobileEditCard> : null}
      {show(3) ? <><MobileEditCard number={2} title="Dirección"><div className="grid grid-cols-2 gap-3"><div className="col-span-2"><GoogleAddressInput display="input" id="mobile-profile-address" value={form.address} placeId={form.addressPlaceId} lat={form.addressLat} lng={form.addressLng} locality={form.locality} province={form.province} postalCode={form.postalCode} onChange={(location)=>{setForm(current=>({...current,address:location.address,addressPlaceId:location.placeId,addressLat:location.lat,addressLng:location.lng,locality:location.locality??current.locality,province:location.province??current.province,postalCode:location.postalCode??current.postalCode}));markUnsaved(3)}} className={controlClass}/></div><Field label="Localidad *"><IconInput id="mobile-profile-locality" leftIcon={<MapPinned className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.locality} onChange={(event)=>setValue("locality",event.target.value)} className={controlClass}/>} /></Field><Field label="Provincia *"><Select value={form.province} onValueChange={(value)=>setValue("province",value)}><SelectTrigger className={controlClass}><SelectValue placeholder="Provincia"/></SelectTrigger><SelectContent>{ARGENTINA_PROVINCES.map(item=><SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field><Field label="Código postal *"><IconInput id="mobile-profile-postal-code" leftIcon={<IdCard className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.postalCode} onChange={(event)=>setValue("postalCode",event.target.value)} className={controlClass}/>} /></Field></div></MobileEditCard><MobileEditCard number={3} title="Geolocalización"><GoogleAddressInput display="map" id="mobile-profile-address-map" value={form.address} placeId={form.addressPlaceId} lat={form.addressLat} lng={form.addressLng} locality={form.locality} province={form.province} postalCode={form.postalCode} onChange={(location)=>{setForm(current=>({...current,address:location.address,addressPlaceId:location.placeId,addressLat:location.lat,addressLng:location.lng,locality:location.locality??current.locality,province:location.province??current.province,postalCode:location.postalCode??current.postalCode}));markUnsaved(3)}} /></MobileEditCard></> : null}
      {show(4) ? <div className="grid grid-cols-2 gap-3"><MobileEditCard number={4} title="Contacto"><div className="space-y-3"><Field label="Email"><IconInput id="mobile-profile-email" leftIcon={<Mail className="size-4 text-[var(--brand-primary)]" />} input={<Input value={data.email} readOnly className={readOnlyClass}/>} /></Field><Field label="Teléfono *"><PhoneInput id="mobile-profile-phone" value={form.phone} onChange={(value)=>setValue("phone",value)} className={controlClass} required/></Field></div></MobileEditCard><MobileEditCard number={5} title="Emergencia"><div className="space-y-3"><Field label="Persona de contacto"><IconInput id="mobile-profile-emergency-name" leftIcon={<Contact className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.emergencyContactName} onChange={(event)=>setValue("emergencyContactName",event.target.value)} className={controlClass}/>} /></Field><Field label="Teléfono de emergencia"><PhoneInput id="mobile-profile-emergency-phone" value={form.emergencyContactPhone} onChange={(value)=>setValue("emergencyContactPhone",value)} className={controlClass} required/></Field></div></MobileEditCard></div> : null}
      {show(5) ? <MobileEditCard number={6} title="Cobertura"><div className="grid grid-cols-2 gap-3"><Field label="Obra social o prepaga"><MedicalCoverageSelect value={form.medicalCoverageId} onChange={(medicalCoverageId)=>{setForm(current=>({...current,medicalCoverageId}));markUnsaved(5)}} /></Field><Field label="Número de afiliado"><IconInput id="mobile-profile-affiliate" leftIcon={<IdCard className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.affiliateNumber} onChange={(event)=>setValue("affiliateNumber",event.target.value)} className={controlClass}/>} /></Field></div></MobileEditCard> : null}
      {show(2) ? <MobileEditCard number={7} title="Seguridad"><Button type="button" onClick={()=>setPasswordDialogOpen(true)} className="h-8 rounded-lg bg-[var(--brand-primary)] px-3 text-xs font-bold"><KeyRound className="size-3"/>Cambiar contraseña</Button></MobileEditCard> : null}
      {show(6) ? <MobileEditCard number={8} title="Imágenes"><div className="grid gap-3"><RequestAccessPhotoField sidePreview title="Avatar" description="Imagen que se mostrará en el portal." allowCamera={false} currentUrl={data.avatarUrl} disabled={saving} onUploaded={({tmpPath})=>{setAvatarTmpPath(tmpPath);markUnsaved(6)}} onClear={()=>{setAvatarTmpPath(null);markUnsaved(6)}}/><RequestAccessPhotoField sidePreview title="Foto de identidad" description="Referencia visual para comprobar tu identidad." currentUrl={data.fotoPerfilUrl} disabled={saving} onUploaded={({tmpPath})=>{setIdentityTmpPath(tmpPath);markUnsaved(6)}} onClear={()=>{setIdentityTmpPath(null);markUnsaved(6)}}/></div></MobileEditCard> : null}
    </div>
  </main> : null;

  const mobileProfileProps={data,onEdit:()=>setMobileEditing(true),onChangePassword:()=>setPasswordDialogOpen(true)};
  return <><>{usesMobileProfile && !mobileEditing ? renderMobileProfile?renderMobileProfile(mobileProfileProps):<CitizenMobileProfile {...mobileProfileProps} experience={workspace === "teacher" ? "teacher" : "citizen"}/> : mobileEditor}</><div className={`${desktopOnlyClass} min-h-[calc(100dvh-var(--topbar-h)-48px)] w-full overflow-y-auto bg-[var(--brand-page)] p-4 pb-28 sm:p-6 lg:h-[calc(100dvh-var(--topbar-h)-48px)] lg:p-8`}><div className="pr-2">
    <AdminFormHeader icon={UserCog} title="Mi perfil" description={workspace === "citizen" ? "Consultá y mantené actualizada tu información personal." : "Consultá y mantené actualizada la información de tu cuenta personal."} className="mb-5" />
    <AdminFormViewToggle value={viewMode} onChange={setViewMode} compactOnMobile={workspace === "citizen"} />
    <AdminWorkflowLayout sections={sections.map((item) => ({ ...item, status: stepStatus[item.id] }))} activeSection={section} onSectionChange={setSection} navigationLabel="Pasos de edición" fullWidth={!workflow}>
      <div className="border-0 bg-transparent p-0 text-[var(--brand-ink)] shadow-none lg:rounded-3xl lg:border lg:border-[var(--brand-secondary)]/20 lg:bg-white/80 lg:p-8 lg:shadow-sm">
        <header className="mb-6 hidden border-b border-[var(--brand-border)] pb-5 lg:block"><h2 className="text-lg font-extrabold text-[var(--brand-heading)]">{meta[0]}</h2><p className="mt-1 text-sm font-medium text-[var(--brand-muted)]">{meta[1]}</p></header>
        <div className="space-y-4 [&>div]:rounded-2xl [&>div]:border [&>div]:border-[var(--brand-border-soft)] [&>div]:bg-[#F9FAF5] [&>div]:p-4 [&>div]:shadow-sm lg:space-y-6 lg:[&>div]:rounded-none lg:[&>div]:border-0 lg:[&>div]:bg-transparent lg:[&>div]:p-0 lg:[&>div]:shadow-none">
          {show(1) ? <div className="grid grid-cols-2 gap-x-3 gap-y-4 lg:gap-x-8">
            <Field label="Nombre *"><IconInput id="profile-first-name" leftIcon={<User className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.firstName} onChange={(event) => setValue("firstName", event.target.value)} onBlur={() => setValue("firstName", titleCase(form.firstName))} className={controlClass} />} /></Field>
            <Field label="Apellido *"><IconInput id="profile-last-name" leftIcon={<UserRound className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.lastName} onChange={(event) => setValue("lastName", event.target.value)} onBlur={() => setValue("lastName", titleCase(form.lastName))} className={controlClass} />} /></Field>
            <Field label="DNI"><IconInput id="profile-document" leftIcon={<IdCard className="size-4 text-[var(--brand-primary)]" />} input={<Input value={data.documento ?? ""} readOnly aria-readonly className={readOnlyClass} />} /></Field>
            <Field label="Fecha de nacimiento *"><Popover><PopoverTrigger asChild><Button variant="outline" type="button" className="h-11 w-full justify-start rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-medium text-[var(--brand-ink)]"><CalendarIcon className="mr-2 size-4 text-[var(--brand-primary)]" />{form.birthDate ? format(fromYmdLocal(form.birthDate), "dd/MM/yyyy", { locale: es }) : <span className="text-muted-foreground">Seleccionar fecha</span>}</Button></PopoverTrigger><PopoverContent className="p-0" align="start"><Calendar mode="single" selected={form.birthDate ? fromYmdLocal(form.birthDate) : undefined} onSelect={(date) => setValue("birthDate", date ? toYmdLocal(date) : "")} captionLayout="dropdown" fromYear={1940} toYear={new Date().getFullYear()} /></PopoverContent></Popover></Field>
            <Field label="Edad"><IconInput id="profile-age" leftIcon={<CakeSlice className="size-4 text-[var(--brand-primary)]" />} input={<Input value={age === null ? "Se calcula automáticamente" : `${age} años`} readOnly className={readOnlyClass} />} /></Field>
            <Field label="Nacionalidad *"><IconInput id="profile-nationality" leftIcon={<Map className="size-4 text-[var(--brand-primary)]" />} input={<Select value={form.nationality} onValueChange={(value: Nacionalidad) => setValue("nationality", value)}><SelectTrigger className={controlClass}><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{NACIONALIDAD_VALUES.map((item) => <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>} /></Field>
            <Field label="Sexo / género *"><IconInput id="profile-gender" leftIcon={<UserRound className="size-4 text-[var(--brand-primary)]" />} input={<Select value={form.gender} onValueChange={(value: Genero) => setValue("gender", value)}><SelectTrigger className={controlClass}><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{GENERO_OPCIONES.map((item) => <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>} /></Field>
          </div> : null}
          {show(2) ? <div className="space-y-4"><div className="grid gap-x-8 gap-y-4 sm:grid-cols-2"><Field label="User ID"><IconInput id="profile-user-id" leftIcon={<User className="size-4 text-[var(--brand-primary)]" />} input={<Input value={data.userId} readOnly aria-readonly className={readOnlyClass} />} /></Field><div className="flex items-end"><Button type="button" className={`${adminPrimaryButtonClass} w-full gap-2`} onClick={() => setPasswordDialogOpen(true)}><KeyRound />Cambiar contraseña</Button></div></div></div> : null}
          {show(3) ? <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-stretch"><div className="grid content-start gap-x-8 gap-y-4 sm:grid-cols-2"><div className="sm:col-span-2"><GoogleAddressInput display="input" id="profile-address" value={form.address} placeId={form.addressPlaceId} lat={form.addressLat} lng={form.addressLng} locality={form.locality} province={form.province} postalCode={form.postalCode} onChange={(location) => { setForm((current) => ({ ...current, address: location.address, addressPlaceId: location.placeId, addressLat: location.lat, addressLng: location.lng, locality: location.locality ?? current.locality, province: location.province ?? current.province, postalCode: location.postalCode ?? current.postalCode })); markUnsaved(3); }} className={controlClass} placeholder="Ej: Av. Presidente Perón 1234" /></div><Field label="Localidad *"><IconInput id="profile-locality" leftIcon={<MapPinned className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.locality} onChange={(event) => setValue("locality", event.target.value)} className={controlClass} />} /></Field><Field label="Provincia *"><IconInput id="profile-province" leftIcon={<Map className="size-4 text-[var(--brand-primary)]" />} input={<Select value={form.province} onValueChange={(value) => setValue("province", value)}><SelectTrigger className={controlClass}><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger><SelectContent>{ARGENTINA_PROVINCES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>} /></Field><Field label="Código postal *"><IconInput id="profile-postal-code" leftIcon={<IdCard className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.postalCode} onChange={(event) => setValue("postalCode", event.target.value)} className={controlClass} />} /></Field></div><div className="min-w-0"><GoogleAddressInput display="map" id="profile-address-map" value={form.address} placeId={form.addressPlaceId} lat={form.addressLat} lng={form.addressLng} locality={form.locality} province={form.province} postalCode={form.postalCode} onChange={(location) => { setForm((current) => ({ ...current, address: location.address, addressPlaceId: location.placeId, addressLat: location.lat, addressLng: location.lng, locality: location.locality ?? current.locality, province: location.province ?? current.province, postalCode: location.postalCode ?? current.postalCode })); markUnsaved(3); }} /></div></div> : null}
          {show(4) ? <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2"><Field label="Email"><IconInput id="profile-email" leftIcon={<Mail className="size-4 text-[var(--brand-primary)]" />} input={<Input value={data.email} readOnly aria-readonly className={readOnlyClass} />} /></Field><Field label="Teléfono *"><PhoneInput id="profile-phone" value={form.phone} onChange={(value) => setValue("phone", value)} className={controlClass} required /></Field><Field label="Persona de contacto de emergencia *"><IconInput id="profile-emergency-name" leftIcon={<Contact className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.emergencyContactName} onChange={(event) => setValue("emergencyContactName", event.target.value)} className={controlClass} />} /></Field><Field label="Teléfono de emergencia *"><PhoneInput id="profile-emergency-phone" value={form.emergencyContactPhone} onChange={(value) => setValue("emergencyContactPhone", value)} className={controlClass} required /></Field></div> : null}
          {show(5) ? <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2"><Field label="Obra social o prepaga" className="sm:col-span-2"><IconInput id="profile-coverage" leftIcon={<HeartPulse className="size-4 text-[var(--brand-primary)]" />} input={<MedicalCoverageSelect value={form.medicalCoverageId} onChange={(medicalCoverageId) => { setForm((current) => ({ ...current, medicalCoverageId })); markUnsaved(5); }} triggerClassName="pl-9" />} /></Field><Field label="Número de afiliado" className="sm:col-span-2"><IconInput id="profile-affiliate" leftIcon={<IdCard className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.affiliateNumber} onChange={(event) => setValue("affiliateNumber", event.target.value)} className={controlClass} />} /></Field></div> : null}
          {show(6) ? <><RequestAccessPhotoField sidePreview title="Avatar" description="Imagen que se mostrará en todo el portal." allowCamera={false} currentUrl={data.avatarUrl} disabled={saving} onUploaded={({ tmpPath }) => { setAvatarTmpPath(tmpPath); markUnsaved(6); }} onClear={() => { setAvatarTmpPath(null); markUnsaved(6); }} /><RequestAccessPhotoField sidePreview title="Foto de identidad" description="Referencia visual utilizada para comprobar tu identidad." currentUrl={data.fotoPerfilUrl} disabled={saving} onUploaded={({ tmpPath }) => { setIdentityTmpPath(tmpPath); markUnsaved(6); }} onClear={() => { setIdentityTmpPath(null); markUnsaved(6); }} /></> : null}
        </div>
        {actions}
      </div>
    </AdminWorkflowLayout>
    <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
  </div></div>{mobileEditActions}</>;
}

export function CitizenProfilePage({workspace="citizen"}:{workspace?:"citizen"|"teacher"}={}){return <PersonalProfilePage workspace={workspace}/>}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1 ${className ?? ""}`}><Label className="font-extrabold text-[var(--brand-ink)]">{label}</Label>{children}</div>;
}

function MobileEditCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-3 shadow-sm"><h2 className="mb-3 flex items-center gap-2 border-b border-[var(--brand-border-soft)] pb-2 text-sm font-extrabold text-[var(--brand-primary)]"><span className="grid size-6 place-items-center rounded-full bg-[#DDF28A] text-xs font-extrabold">{number}</span>{title}</h2>{children}</section>;
}
