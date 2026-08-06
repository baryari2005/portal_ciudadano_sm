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

type CitizenProfile = { id: string; userId: string; nombre: string | null; apellido: string | null; documento: string | null; email: string; celular: string | null; domicilio: string | null; localidad: string | null; provincia: string | null; codigoPostal: string | null; domicilioPlaceId: string | null; domicilioLat: number | null; domicilioLng: number | null; fechaNacimiento: string | null; genero: Genero | null; nacionalidad: Nacionalidad | null; avatarUrl: string | null; fotoPerfilUrl: string | null; contactoEmergenciaNombre: string | null; contactoEmergenciaTelefono: string | null; coberturaMedicaId: string | null; numeroAfiliado: string | null };
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

export function CitizenProfilePage({ workspace = "citizen" }: { workspace?: "citizen" | "reception" | "teacher" } = {}) {
  const { data, setData, loading, error, retry } = useCitizenData<CitizenProfile>("/profile");
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [section, setSection] = useState(1);
  const [viewMode, setViewMode] = useState<"workflow" | "full">("full");
  const [stepStatus, setStepStatus] = useState<Record<number, DraftStepStatus>>(initialStatuses);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string>();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const loadedDraftFor = useRef<string | undefined>(undefined);
  const { tmpPath: avatarTmpPath, setTmpPath: setAvatarTmpPath, commit: commitAvatar } = useAvatarStaging();
  const { tmpPath: identityTmpPath, setTmpPath: setIdentityTmpPath, commit: commitIdentity } = useAvatarStaging();
  const fetchMe = useAuth((state) => state.fetchMe);
  const workflow = viewMode === "workflow";
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
  const setValue = (field: keyof ProfileForm, value: string) => { setForm((current) => ({ ...current, [field]: value })); markUnsaved(fieldSection[field] ?? section); };
  const age = form.birthDate ? Math.max(0, new Date(Date.now() - fromYmdLocal(form.birthDate).getTime()).getUTCFullYear() - 1970) : null;

  function isSectionValid(number: number) {
    if (number === 1) return Boolean(form.firstName.trim() && form.lastName.trim() && form.birthDate && form.nationality && form.gender);
    if (number === 3) return Boolean(form.address.trim() && form.locality.trim() && form.province && form.postalCode.trim());
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
    if (!isValidPhone(form.phone)) { setSection(4); toast.error(PHONE_VALIDATION_MESSAGE); return; }
    if (!form.emergencyContactName.trim() || !isValidPhone(form.emergencyContactPhone)) { setSection(4); toast.error("Completá correctamente el contacto de emergencia."); return; }
    setSaving(true);
    try {
      let profilePhotoUrl: string | undefined;
      if (identityTmpPath) { const committed = await commitIdentity(`identity-photos/${data.id}`, pathFromPublicUrl(data.fotoPerfilUrl)); profilePhotoUrl = committed.publicUrl; }
      let updated = await citizenPatch<CitizenProfile>("/profile", { ...form, firstName: titleCase(form.firstName), lastName: titleCase(form.lastName), address: titleCase(form.address), ...(profilePhotoUrl ? { profilePhotoUrl } : {}) });
      if (avatarTmpPath) { const committed = await commitAvatar(`users/${data.id}`, pathFromPublicUrl(data.avatarUrl)); await changeMyAvatar({ avatarUrl: committed.publicUrl }); updated = { ...updated, avatarUrl: committed.publicUrl }; }
      setData(updated); if (draftId) await deleteUserDraft(draftId); setDraftId(undefined); setStepStatus({ 1: "valid", 2: "valid", 3: "valid", 4: "valid", 5: "valid", 6: "valid" }); await fetchMe(true); toast.success("Perfil actualizado.");
    } catch { toast.error("No pudimos actualizar tu perfil."); }
    finally { setSaving(false); }
  }

  async function discardDraft() { if (!draftId) return; await deleteUserDraft(draftId); window.location.reload(); }

  if (loading) return <CatalogLoadingState label="perfil" fullPage />;
  if (error || !data) return <div className="grid min-h-[calc(100dvh-var(--topbar-h)-48px)] place-items-center bg-[var(--brand-page)] p-6"><AdminFormCard title="No pudimos cargar tu perfil."><Button variant="outline" onClick={retry}>Reintentar</Button></AdminFormCard></div>;

  const meta = workflow ? sectionMeta[section - 1] : ["Datos del usuario", "Información disponible para mantener actualizado tu perfil."] as const;
  const backHref = workspace === "reception" ? "/reception" : workspace === "teacher" ? "/teacher" : "/citizen";
  const actions = <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--brand-border)] pt-5 sm:flex-row sm:flex-wrap sm:justify-between">
    {workflow && section > 1 ? <Button type="button" variant="outline" className={`${adminSecondaryButtonClass} w-full justify-center gap-3 sm:w-auto`} onClick={() => setSection((current) => current - 1)}><ArrowLeft className="size-5" />Anterior</Button> : <Button asChild type="button" variant="outline" className={`${adminSecondaryButtonClass} w-full justify-center gap-3 sm:w-auto`}><Link href={backHref}><ArrowLeft className="size-5" />Volver</Link></Button>}
    <div className="flex flex-col gap-3 sm:flex-row">
      {draftId ? <Button type="button" variant="ghost" className="h-12 gap-2 rounded-xl text-red-700 hover:bg-red-50" disabled={savingDraft || saving} onClick={() => void discardDraft()}><Trash2 />Descartar borrador</Button> : null}
      <Button type="button" variant="outline" className={`${adminSecondaryButtonClass} w-full justify-center gap-3 sm:w-auto`} disabled={savingDraft || saving} onClick={() => void saveDraft()}>{savingDraft ? <Loader2 className="animate-spin" /> : <Save />}Guardar borrador</Button>
      {workflow && section < 6 ? <Button type="button" className={`${adminPrimaryButtonClass} w-full justify-center gap-3 sm:w-auto`} disabled={savingDraft || saving} onClick={() => void continueToNextStep()}>Guardar y continuar<ChevronRight className="size-5" /></Button> : <Button type="button" className={`${adminPrimaryButtonClass} w-full justify-center gap-3 sm:w-auto`} disabled={savingDraft || saving} onClick={() => void save()}>{saving ? <Loader2 className="animate-spin" /> : null}Guardar cambios<Save /></Button>}
    </div>
  </div>;

  return <div className="min-h-[calc(100dvh-var(--topbar-h)-48px)] w-full overflow-y-auto bg-[var(--brand-page)] p-4 sm:p-6 lg:h-[calc(100dvh-var(--topbar-h)-48px)] lg:p-8"><div className="pr-2">
    <AdminFormHeader icon={UserCog} title="Mi perfil" description={workspace === "citizen" ? "Consultá y mantené actualizada tu información personal." : "Consultá y mantené actualizada la información de tu cuenta personal."} className="mb-5" />
    <AdminFormViewToggle value={viewMode} onChange={setViewMode} />
    <AdminWorkflowLayout sections={sections.map((item) => ({ ...item, status: stepStatus[item.id] }))} activeSection={section} onSectionChange={setSection} navigationLabel="Pasos de edición" fullWidth={!workflow}>
      <div className="rounded-3xl border border-[var(--brand-secondary)]/20 bg-white/80 p-5 text-[var(--brand-ink)] shadow-sm sm:p-6 lg:p-8">
        <header className="mb-6 border-b border-[var(--brand-border)] pb-5"><h2 className="text-lg font-extrabold text-[var(--brand-heading)]">{meta[0]}</h2><p className="mt-1 text-sm font-medium text-[var(--brand-muted)]">{meta[1]}</p></header>
        <div className="space-y-6">
          {show(1) ? <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Field label="Nombre *"><IconInput id="profile-first-name" leftIcon={<User className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.firstName} onChange={(event) => setValue("firstName", event.target.value)} onBlur={() => setValue("firstName", titleCase(form.firstName))} className={controlClass} />} /></Field>
            <Field label="Apellido *"><IconInput id="profile-last-name" leftIcon={<UserRound className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.lastName} onChange={(event) => setValue("lastName", event.target.value)} onBlur={() => setValue("lastName", titleCase(form.lastName))} className={controlClass} />} /></Field>
            <Field label="DNI"><IconInput id="profile-document" leftIcon={<IdCard className="size-4 text-[var(--brand-primary)]" />} input={<Input value={data.documento ?? ""} readOnly aria-readonly className={readOnlyClass} />} /></Field>
            <Field label="Fecha de nacimiento *"><Popover><PopoverTrigger asChild><Button variant="outline" type="button" className="h-11 w-full justify-start rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-medium text-[var(--brand-ink)]"><CalendarIcon className="mr-2 size-4 text-[var(--brand-primary)]" />{form.birthDate ? format(fromYmdLocal(form.birthDate), "dd/MM/yyyy", { locale: es }) : <span className="text-muted-foreground">Seleccionar fecha</span>}</Button></PopoverTrigger><PopoverContent className="p-0" align="start"><Calendar mode="single" selected={form.birthDate ? fromYmdLocal(form.birthDate) : undefined} onSelect={(date) => setValue("birthDate", date ? toYmdLocal(date) : "")} captionLayout="dropdown" fromYear={1940} toYear={new Date().getFullYear()} /></PopoverContent></Popover></Field>
            <Field label="Edad"><IconInput id="profile-age" leftIcon={<CakeSlice className="size-4 text-[var(--brand-primary)]" />} input={<Input value={age === null ? "Se calcula automáticamente" : `${age} años`} readOnly className={readOnlyClass} />} /></Field>
            <Field label="Nacionalidad *"><IconInput id="profile-nationality" leftIcon={<Map className="size-4 text-[var(--brand-primary)]" />} input={<Select value={form.nationality} onValueChange={(value: Nacionalidad) => setValue("nationality", value)}><SelectTrigger className={controlClass}><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{NACIONALIDAD_VALUES.map((item) => <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>} /></Field>
            <Field label="Sexo / género *"><IconInput id="profile-gender" leftIcon={<UserRound className="size-4 text-[var(--brand-primary)]" />} input={<Select value={form.gender} onValueChange={(value: Genero) => setValue("gender", value)}><SelectTrigger className={controlClass}><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{GENERO_OPCIONES.map((item) => <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>} /></Field>
          </div> : null}
          {show(2) ? <div className="space-y-4"><div className="grid gap-x-8 gap-y-4 sm:grid-cols-2"><Field label="User ID"><IconInput id="profile-user-id" leftIcon={<User className="size-4 text-[var(--brand-primary)]" />} input={<Input value={data.userId} readOnly aria-readonly className={readOnlyClass} />} /></Field><div className="flex items-end"><Button type="button" className={`${adminPrimaryButtonClass} w-full gap-2`} onClick={() => setPasswordDialogOpen(true)}><KeyRound />Cambiar contraseña</Button></div></div></div> : null}
          {show(3) ? <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2"><Field label="Dirección *" className="sm:col-span-2"><GoogleAddressInput id="profile-address" value={form.address} placeId={form.addressPlaceId} onChange={(location) => { setForm((current) => ({ ...current, address: location.address, addressPlaceId: location.placeId, addressLat: location.lat, addressLng: location.lng })); markUnsaved(3); }} className={controlClass} placeholder="Ej: Av. Presidente Perón 1234" /></Field><Field label="Localidad *"><IconInput id="profile-locality" leftIcon={<MapPinned className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.locality} onChange={(event) => setValue("locality", event.target.value)} className={controlClass} />} /></Field><Field label="Provincia *"><IconInput id="profile-province" leftIcon={<Map className="size-4 text-[var(--brand-primary)]" />} input={<Select value={form.province} onValueChange={(value) => setValue("province", value)}><SelectTrigger className={controlClass}><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger><SelectContent>{ARGENTINA_PROVINCES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>} /></Field><Field label="Código postal *"><IconInput id="profile-postal-code" leftIcon={<IdCard className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.postalCode} onChange={(event) => setValue("postalCode", event.target.value)} className={controlClass} />} /></Field></div> : null}
          {show(4) ? <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2"><Field label="Email"><IconInput id="profile-email" leftIcon={<Mail className="size-4 text-[var(--brand-primary)]" />} input={<Input value={data.email} readOnly aria-readonly className={readOnlyClass} />} /></Field><Field label="Teléfono *"><PhoneInput id="profile-phone" value={form.phone} onChange={(value) => setValue("phone", value)} className={controlClass} required /></Field><Field label="Persona de contacto de emergencia *"><IconInput id="profile-emergency-name" leftIcon={<Contact className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.emergencyContactName} onChange={(event) => setValue("emergencyContactName", event.target.value)} className={controlClass} />} /></Field><Field label="Teléfono de emergencia *"><PhoneInput id="profile-emergency-phone" value={form.emergencyContactPhone} onChange={(value) => setValue("emergencyContactPhone", value)} className={controlClass} required /></Field></div> : null}
          {show(5) ? <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2"><Field label="Obra social o prepaga" className="sm:col-span-2"><IconInput id="profile-coverage" leftIcon={<HeartPulse className="size-4 text-[var(--brand-primary)]" />} input={<MedicalCoverageSelect value={form.medicalCoverageId} onChange={(medicalCoverageId) => { setForm((current) => ({ ...current, medicalCoverageId })); markUnsaved(5); }} triggerClassName="pl-9" />} /></Field><Field label="Número de afiliado" className="sm:col-span-2"><IconInput id="profile-affiliate" leftIcon={<IdCard className="size-4 text-[var(--brand-primary)]" />} input={<Input value={form.affiliateNumber} onChange={(event) => setValue("affiliateNumber", event.target.value)} className={controlClass} />} /></Field></div> : null}
          {show(6) ? <><RequestAccessPhotoField sidePreview title="Avatar" description="Imagen que se mostrará en todo el portal." allowCamera={false} currentUrl={data.avatarUrl} disabled={saving} onUploaded={({ tmpPath }) => { setAvatarTmpPath(tmpPath); markUnsaved(6); }} onClear={() => { setAvatarTmpPath(null); markUnsaved(6); }} /><RequestAccessPhotoField sidePreview title="Foto de identidad" description="Referencia visual utilizada para comprobar tu identidad." currentUrl={data.fotoPerfilUrl} disabled={saving} onUploaded={({ tmpPath }) => { setIdentityTmpPath(tmpPath); markUnsaved(6); }} onClear={() => { setIdentityTmpPath(null); markUnsaved(6); }} /></> : null}
        </div>
        {actions}
      </div>
    </AdminWorkflowLayout>
    <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
  </div></div>;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1 ${className ?? ""}`}><Label className="font-extrabold text-[var(--brand-ink)]">{label}</Label>{children}</div>;
}
