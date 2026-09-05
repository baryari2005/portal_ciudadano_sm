"use client";

import { useState, type ReactNode } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon,
  AlignLeft,
  BadgeCheck,
  BookOpen,
  CakeSlice,
  Contact,
  ClipboardCheck,
  Eye,
  EyeOff,
  Lock,
  HeartPulse,
  IdCard,
  Map,
  MapPinned,
  User,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DocumentNumberInput } from "@/components/forms/DocumentNumberInput";
import { EmailInput } from "@/components/forms/EmailInput";
import { IconInput } from "@/components/forms/IconInput";
import { PhoneInput } from "@/components/forms/PhoneInput";
import { GoogleAddressInput } from "@/components/forms/GoogleAddressInput";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RequestAccessPhotoField } from "@/features/auth/request-access/components/RequestAccessPhotoField";
import { MedicalCoverageSelect } from "@/features/medical-coverages/components/MedicalCoverageSelect";
import { GENERO_OPCIONES } from "@/constants/genero";
import { NACIONALIDAD_VALUES } from "@/constants/nacionalidad";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ARGENTINA_PROVINCES } from "@/constants/argentina-locations";
import { isValidPhone, PHONE_VALIDATION_MESSAGE } from "@/lib/validation/phone";
import {
  DOCUMENT_NUMBER_VALIDATION_MESSAGE,
  isValidDni,
} from "@/lib/validation/document";

import { UserFormValues } from "../types/types";
import { RoleSelect } from "./RoleSelect";
import { FormErrorMessage } from "./form/FormErrorMessage";

type Mode = "create" | "edit";

function ReviewItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-[#D7E3D1] bg-[#F8FBF6] px-4 py-3">
      <p className="text-xs font-bold uppercase text-[var(--brand-secondary)]">{label}</p>
      <p className="mt-1 font-semibold text-[var(--brand-ink)]">{value || "No informado"}</p>
    </div>
  );
}

const titleCaseEs = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(
      /([a-záéíóúüñ]+)([a-záéíóúüñ'-]*)/gi,
      (_m, p1: string, p2: string) =>
        p1.charAt(0).toUpperCase() + p1.slice(1) + p2,
    );

function fromYmdLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function UserFormFields({
  mode,
  form,
  roles,
  loadingRoles,
  currentAvatarUrl,
  onTempAvatarUploaded,
  onTempAvatarCleared,
  onTempPortalAvatarUploaded,
  step,
  footer,
  fixedRoleLabel,
  hasPortalAvatar,
  hasIdentityPhoto,
  onMediaUploadingChange,
  showReview = true,
  mobileRequestAccess = false,
  lockedLocality,
}: {
  mode: Mode;
  form: UseFormReturn<UserFormValues>;
  roles: Array<{ id: number; nombre: string; codigo?: string }>;
  loadingRoles: boolean;
  currentAvatarUrl?: string | null;
  onTempAvatarUploaded?: (tmpPath: string | null) => void;
  onTempAvatarCleared?: () => void;
  onTempPortalAvatarUploaded?: (tmpPath: string | null) => void;
  step?: number;
  footer?: ReactNode;
  fixedRoleLabel?: string;
  hasPortalAvatar?: boolean;
  hasIdentityPhoto?: boolean;
  onMediaUploadingChange?: (uploading: boolean) => void;
  showReview?: boolean;
  mobileRequestAccess?: boolean;
  lockedLocality?: string;
}) {
  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = form;

  const [showPassword, setShowPassword] = useState(false);
  const rolValue = watch("rolId");
  const selectedRole = roles.find((role) => role.id === Number(rolValue));
  const selectedRoleCode = selectedRole?.codigo?.trim().toLowerCase();
  const selectedRoleName = selectedRole?.nombre.trim().toLowerCase();
  const isProfessorRole = ["teacher", "profesor"].includes(selectedRoleCode ?? "") || selectedRoleName === "profesor";
  const isEdit = mode === "edit";
  const show = (section: number) => step == null || step === section;
  const birthDate = watch("fechaNacimiento");
  const age = birthDate ? Math.max(0, new Date(Date.now() - fromYmdLocal(birthDate).getTime()).getUTCFullYear() - 1970) : null;
  const invalidateAddressLocation = () => {
    setValue("domicilioPlaceId", null);
    setValue("domicilioLat", null);
    setValue("domicilioLng", null);
  };
  const sectionMeta = step ? [
    ["Datos personales", "Identidad, fecha de nacimiento y datos demográficos."],
    ["Credenciales", "Usuario, contraseña y rol de acceso."],
    ["Domicilio", "Dirección, localidad, provincia y código postal."],
    ["Contacto", "Datos de contacto y referencia de emergencia."],
    ["Cobertura médica", "Obra social o prepaga y número de afiliado."],
    ["Imágenes", "Avatar del portal y foto para comprobar la identidad."],
  ][step - 1] : ["Datos del usuario", "Información requerida para registrar el acceso al sistema."];
  const requestSectionMeta = step ? [
    ["Datos personales", "Completá tu identidad y fecha de nacimiento."],
    ["Credenciales", "Definí el usuario y la contraseña con los que vas a ingresar."],
    ["Domicilio", "Informá dirección, localidad, provincia y código postal."],
    ["Contacto", "Completá tus datos de contacto y la referencia de emergencia."],
    ["Cobertura médica", "Informá tu obra social o prepaga, si corresponde."],
    ["Imágenes", "Cargá el avatar del portal y tu foto para validar la identidad."],
  ][step - 1] : null;
  const displayedSectionMeta = mobileRequestAccess && requestSectionMeta ? requestSectionMeta : sectionMeta;

  return (
    <div className={`rounded-3xl border border-[var(--brand-secondary)]/20 bg-white/80 p-5 text-[var(--brand-ink)] shadow-sm sm:p-6 lg:p-8 ${mobileRequestAccess ? "!rounded-2xl !border-[var(--brand-border-soft)] !bg-[#F9FAF5] !p-3 !pb-32 md:!rounded-3xl md:!border-[var(--brand-secondary)]/20 md:!bg-white/80 md:!p-6 lg:!p-8" : ""}`}>
      <div className="mb-6 flex items-center justify-between border-b border-[var(--brand-border)] pb-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-[var(--brand-heading)]">
            {mobileRequestAccess && step ? <span className="grid size-7 place-items-center rounded-full bg-[#DDF28A] text-xs font-extrabold text-[var(--brand-primary)] md:hidden">{step}</span> : null}{displayedSectionMeta?.[0] ?? "Revisión"}
          </h2>
          <p className="mt-1 text-sm font-medium text-[var(--brand-muted)]">
            {displayedSectionMeta?.[1] ?? "Verificá que todas las secciones estén completas antes de guardar."}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {step == null || (step != null && [1, 3, 4, 5].includes(step)) ? <div className={`grid gap-y-4 ${mobileRequestAccess ? "grid-cols-2 gap-x-3 md:gap-x-8" : "gap-x-8 sm:grid-cols-2"}`}>
          {show(1) ? <>
          <div className="space-y-1">
            <Label className="font-extrabold text-[var(--brand-ink)]">Nombre *</Label>
            <IconInput
              id="nombre"
              leftIcon={<User className="h-4 w-4 text-[var(--brand-primary)]" />}
              input={
                <Input
                  id="nombre"
                  {...register("nombre", {
                    onBlur: (e) =>
                      setValue("nombre", titleCaseEs(e.target.value), {
                        shouldDirty: true,
                        shouldValidate: true,
                      }),
                  })}
                  className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 font-medium text-[var(--brand-ink)]"
                  placeholder="Ej: Juan"
                />
              }
            />
            <FormErrorMessage message={errors.nombre?.message} />
          </div>

          <div className="space-y-1">
            <Label className="font-extrabold text-[var(--brand-ink)]">Apellido *</Label>
            <IconInput
              id="apellido"
              leftIcon={<UserRound className="h-4 w-4 text-[var(--brand-primary)]" />}
              input={
                <Input
                  id="apellido"
                  {...register("apellido", {
                    onBlur: (e) =>
                      setValue("apellido", titleCaseEs(e.target.value), {
                        shouldDirty: true,
                        shouldValidate: true,
                      }),
                  })}
                  className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 font-medium text-[var(--brand-ink)]"
                  placeholder="Ej: Pérez"
                />
              }
            />
            <FormErrorMessage message={errors.apellido?.message} />
          </div>

          <div className="space-y-1">
            <Label className="font-extrabold text-[var(--brand-ink)]">DNI *</Label>
            <Controller
              control={control}
              name="documento"
              rules={{
                validate: (value) =>
                  isValidDni(value) || DOCUMENT_NUMBER_VALIDATION_MESSAGE,
              }}
              render={({ field }) => (
                <DocumentNumberInput
                  id="documento"
                  value={field.value ?? ""}
                  onChange={(value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 font-medium text-[var(--brand-ink)]"
                  required
                />
              )}
            />
            <FormErrorMessage message={errors.documento?.message} />
          </div>

          <div className="space-y-1">
            <Label className="font-extrabold text-[var(--brand-ink)]">
              Fecha de nacimiento *
            </Label>
            <Controller
              control={control}
              name="fechaNacimiento"
              render={({ field }) => {
                const raw = field.value as string | null | undefined;
                const ymd = typeof raw === "string" ? raw : null;
                const dateValue = ymd ? fromYmdLocal(ymd) : undefined;

                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        type="button"
                        className="h-11 w-full justify-start rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-medium text-[var(--brand-ink)]"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-[var(--brand-primary)]" />
                        {dateValue ? (
                          format(dateValue, "dd/MM/yyyy", { locale: es })
                        ) : (
                          <span className="text-muted-foreground">
                            Seleccionar fecha
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateValue}
                        onSelect={(d) =>
                          field.onChange(d ? toYmdLocal(d) : null)
                        }
                        captionLayout="dropdown"
                        fromYear={1940}
                        toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                );
              }}
            />
            <FormErrorMessage message={errors.fechaNacimiento?.message} />
          </div>

          <div className="space-y-1"><Label className="font-extrabold text-[var(--brand-ink)]">Edad</Label><IconInput id="edad" leftIcon={<CakeSlice className="size-4 text-[var(--brand-primary)]"/>} input={<Input readOnly value={age === null ? "Se calcula automáticamente" : `${age} años`} className="h-11 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9"/>}/></div>
          <div className="space-y-1"><Label className="font-extrabold text-[var(--brand-ink)]">Nacionalidad *</Label><Controller control={control} name="nacionalidad" render={({field})=><IconInput id="nacionalidad" leftIcon={<Map className="size-4 text-[var(--brand-primary)]"/>} input={<Select value={field.value} onValueChange={field.onChange}><SelectTrigger className="h-11 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9"><SelectValue placeholder="Seleccionar"/></SelectTrigger><SelectContent>{NACIONALIDAD_VALUES.map(item=><SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>}/>} /></div>
          <div className="space-y-1"><Label className="font-extrabold text-[var(--brand-ink)]">Sexo / género *</Label><Controller control={control} name="genero" render={({field})=><IconInput id="genero" leftIcon={<UserRound className="size-4 text-[var(--brand-primary)]"/>} input={<Select value={field.value} onValueChange={field.onChange}><SelectTrigger className="h-11 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9"><SelectValue placeholder="Seleccionar"/></SelectTrigger><SelectContent>{GENERO_OPCIONES.map(item=><SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>}/>} /></div>
          </> : null}

          {show(3) ? <div className={`grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-stretch ${mobileRequestAccess ? "col-span-2" : "sm:col-span-2"}`}><div className={`grid content-start ${mobileRequestAccess ? "grid-cols-2 gap-3 md:gap-4" : "gap-4 sm:grid-cols-2"}`}>

          <div className={mobileRequestAccess ? "col-span-2" : "sm:col-span-2"}>
            <Controller control={control} name="domicilio" render={({field})=><GoogleAddressInput display="input" id="domicilio" value={field.value??""} placeId={watch("domicilioPlaceId")} lat={watch("domicilioLat")} lng={watch("domicilioLng")} locality={watch("localidad")} province={watch("provincia")} postalCode={watch("codigoPostal")} onChange={(location)=>{field.onChange(location.address);setValue("domicilioPlaceId",location.placeId);setValue("domicilioLat",location.lat);setValue("domicilioLng",location.lng);if(location.locality && !lockedLocality)setValue("localidad",location.locality);if(location.province)setValue("provincia",location.province);if(location.postalCode)setValue("codigoPostal",location.postalCode)}} className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 font-medium text-[var(--brand-ink)]" placeholder="Ej: Av. Presidente Perón 1234"/>}/>
            <FormErrorMessage message={errors.domicilio?.message} />
          </div>

          <div className="space-y-1"><Label className="font-extrabold text-[var(--brand-ink)]">Localidad *</Label><Controller control={control} name="localidad" render={({ field }) => <IconInput id="localidad" leftIcon={<MapPinned className="size-4 text-[var(--brand-primary)]"/>} input={<Input {...field} value={lockedLocality ?? field.value ?? ""} readOnly={Boolean(lockedLocality)} aria-readonly={Boolean(lockedLocality)} onChange={(event) => { field.onChange(event); invalidateAddressLocation(); }} className={`h-11 w-full rounded-xl border-[var(--brand-border)] pl-9 ${lockedLocality ? "cursor-not-allowed bg-muted text-muted-foreground" : "bg-[var(--brand-page)]"}`}/>} />} /></div>
          <div className="space-y-1"><Label className="font-extrabold text-[var(--brand-ink)]">Provincia *</Label><Controller control={control} name="provincia" render={({field}) => <IconInput id="provincia" leftIcon={<Map className="size-4 text-[var(--brand-primary)]"/>} input={<Select value={field.value} onValueChange={(value) => { field.onChange(value); invalidateAddressLocation(); }}><SelectTrigger className="h-11 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9"><SelectValue placeholder="Seleccionar provincia"/></SelectTrigger><SelectContent>{ARGENTINA_PROVINCES.map(item=><SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>} />} /></div>
          <div className="space-y-1"><Label className="font-extrabold text-[var(--brand-ink)]">Código postal *</Label><Controller control={control} name="codigoPostal" render={({ field }) => <IconInput id="codigoPostal" leftIcon={<IdCard className="size-4 text-[var(--brand-primary)]"/>} input={<Input {...field} onChange={(event) => { field.onChange(event); invalidateAddressLocation(); }} className="h-11 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9"/>} />} /></div>
          </div><div className="min-w-0"><Controller control={control} name="domicilio" render={({field})=><GoogleAddressInput display="map" id="domicilio-map" value={field.value??""} placeId={watch("domicilioPlaceId")} lat={watch("domicilioLat")} lng={watch("domicilioLng")} locality={watch("localidad")} province={watch("provincia")} postalCode={watch("codigoPostal")} onChange={(location)=>{field.onChange(location.address);setValue("domicilioPlaceId",location.placeId);setValue("domicilioLat",location.lat);setValue("domicilioLng",location.lng);if(location.locality && !lockedLocality)setValue("localidad",location.locality);if(location.province)setValue("provincia",location.province);if(location.postalCode)setValue("codigoPostal",location.postalCode)}} />}/></div></div> : null}

          {show(4) ? <>

          <div className="space-y-1">
            <Label className="font-extrabold text-[var(--brand-ink)]">Email *</Label>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <EmailInput
                  id="email"
                  value={field.value ?? ""}
                  onChange={(value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 font-medium text-[var(--brand-ink)]"
                  required
                />
              )}
            />
            <FormErrorMessage message={errors.email?.message} />
          </div>

          <div className="space-y-1">
            <Label className="font-extrabold text-[var(--brand-ink)]">Telefono *</Label>
            <Controller
              control={control}
              name="celular"
              rules={{
                validate: (value) =>
                  isValidPhone(value) || PHONE_VALIDATION_MESSAGE,
              }}
              render={({ field }) => (
                <PhoneInput
                  id="celular"
                  value={field.value ?? ""}
                  onChange={(value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 font-medium text-[var(--brand-ink)]"
                  required
                />
              )}
            />
            <FormErrorMessage message={errors.celular?.message} />
          </div>
          <div className="space-y-1"><Label className="font-extrabold text-[var(--brand-ink)]">Persona de contacto de emergencia</Label><IconInput id="contactoEmergenciaNombre" leftIcon={<Contact className="size-4 text-[var(--brand-primary)]"/>} input={<Input {...register("contactoEmergenciaNombre")} className="h-11 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9" placeholder="Nombre y apellido"/>}/></div>
          <div className="space-y-1"><Label className="font-extrabold text-[var(--brand-ink)]">Teléfono de emergencia</Label><Controller control={control} name="contactoEmergenciaTelefono" render={({field})=><PhoneInput id="contactoEmergenciaTelefono" value={field.value??""} onChange={field.onChange} onBlur={field.onBlur} className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9"/>}/></div>
          </> : null}
          {show(5) ? <>
          <div className="space-y-1 sm:col-span-2"><Label className="font-extrabold text-[var(--brand-ink)]">Obra social o prepaga</Label><Controller control={control} name="coberturaMedicaId" render={({field})=><IconInput id="coberturaMedicaId" leftIcon={<HeartPulse className="size-4 text-[var(--brand-primary)]"/>} input={<MedicalCoverageSelect value={field.value} onChange={field.onChange} triggerClassName="pl-9"/>}/>} /></div>
          <div className="space-y-1 sm:col-span-2"><Label className="font-extrabold text-[var(--brand-ink)]">Número de afiliado</Label><IconInput id="numeroAfiliado" leftIcon={<IdCard className="size-4 text-[var(--brand-primary)]"/>} input={<Input {...register("numeroAfiliado")} className="h-11 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9"/>}/></div>
          </> : null}
        </div> : null}

        {show(6) ? <>
        <RequestAccessPhotoField sidePreview title="Avatar" description="Imagen que se mostrará en todo el portal." allowCamera={false} currentUrl={isEdit ? watch("avatarUrl") : null} disabled={isSubmitting} onUploaded={({tmpPath})=>onTempPortalAvatarUploaded?.(tmpPath)} onClear={()=>onTempPortalAvatarUploaded?.(null)} onUploadingChange={onMediaUploadingChange} />
        <RequestAccessPhotoField
          sidePreview
          title="Foto de identidad"
          description="Referencia visual utilizada para comprobar la identidad de la persona."
          currentUrl={isEdit ? currentAvatarUrl : null}
          disabled={isSubmitting}
          onUploaded={({ tmpPath }) => onTempAvatarUploaded?.(tmpPath)}
          onClear={() => {
            onTempAvatarUploaded?.(null);
            onTempAvatarCleared?.();
          }}
          onUploadingChange={onMediaUploadingChange}
        />
        </> : null}

        {showReview && show(7) ? <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <ReviewItem label="Nombre completo" value={`${watch("nombre") || ""} ${watch("apellido") || ""}`.trim()} />
            <ReviewItem label="DNI" value={watch("documento")} />
            <ReviewItem label="Email" value={watch("email")} />
            <ReviewItem label="Teléfono" value={watch("celular")} />
            <ReviewItem label="Dirección" value={[watch("domicilio"), watch("localidad"), watch("provincia")].filter(Boolean).join(", ")} />
            <ReviewItem label="Contacto de emergencia" value={watch("contactoEmergenciaNombre")} />
            <ReviewItem label="Usuario" value={watch("userId")} />
            <ReviewItem label="Rol" value={fixedRoleLabel || roles.find((role) => role.id === rolValue)?.nombre} />
            {isProfessorRole ? <>
              <ReviewItem label="Especialidad" value={watch("profesorEspecialidad")} />
              <ReviewItem label="Matrícula" value={watch("profesorMatricula")} />
              <ReviewItem label="Descripción profesional" value={watch("profesorDescripcion")} />
            </> : null}
            <ReviewItem label="Cobertura médica" value={watch("coberturaMedicaId") ? "Cobertura seleccionada" : "Sin cobertura"} />
            <ReviewItem label="Imágenes" value={`${hasPortalAvatar ? "Avatar cargado" : "Sin avatar"} · ${hasIdentityPhoto ? "Foto de identidad cargada" : "Sin foto de identidad"}`} />
          </div>
          <div className="flex gap-3 rounded-xl border border-[var(--brand-border)] bg-white/60 p-4 text-sm text-[#4D6257]">
            <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-[var(--brand-primary)]" />
            <p>Al guardar se validarán nuevamente todas las secciones. Si existe un error, volverás automáticamente al paso correspondiente.</p>
          </div>
        </div> : null}

        {show(2) ? <div className="space-y-4">
          <div className={`grid gap-y-4 ${mobileRequestAccess ? "grid-cols-2 gap-x-3 md:gap-x-8" : "gap-x-8 sm:grid-cols-2"}`}>
            <div className="space-y-1">
              <Label className="font-extrabold text-[var(--brand-ink)]">User ID *</Label>
              <IconInput id="userId" leftIcon={<User className="size-4 text-[var(--brand-primary)]"/>} input={<Input
                {...register("userId")}
                readOnly={isEdit}
                aria-readonly={isEdit}
                className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-10 font-medium text-[var(--brand-ink)]"
                autoComplete="username"
                placeholder="Ej: jperez"
                onKeyDown={(e) => {
                  if (isEdit) e.preventDefault();
                }}
                onPaste={(e) => {
                  if (isEdit) e.preventDefault();
                }}
              />}/>
              <FormErrorMessage message={errors.userId?.message} />
            </div>

            <div className={`space-y-1 ${mobileRequestAccess && fixedRoleLabel ? "hidden md:block" : ""}`}>
              <Label className="font-extrabold text-[var(--brand-ink)]">Rol *</Label>
              {fixedRoleLabel ? <IconInput id="rolId" leftIcon={<IdCard className="size-4 text-[var(--brand-primary)]" />} input={<Input value={fixedRoleLabel} readOnly className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-panel)] pl-9 font-medium text-[var(--brand-ink)]" />} /> : <IconInput id="rolId" leftIcon={<IdCard className="size-4 text-[var(--brand-primary)]"/>} input={<RoleSelect
                value={rolValue == null ? "" : String(rolValue)}
                onChange={(v) =>
                  setValue("rolId", Number(v), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                roles={roles}
                disabled={loadingRoles || isSubmitting}
                triggerClassName="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 font-medium text-[var(--brand-ink)]"
              />}/>}<FormErrorMessage message={errors.rolId?.message} />
            </div>

            <div className={`space-y-1 ${mobileRequestAccess ? "md:col-span-2" : "sm:col-span-2"}`}>
              <Label className="font-extrabold text-[var(--brand-ink)]">
                {isEdit ? (
                  <>
                    Nueva contraseña{" "}
                    <span className="text-xs text-[var(--brand-muted)]">(opcional)</span>
                  </>
                ) : (
                  "Contraseña *"
                )}
              </Label>
              <IconInput
                id="password"
                leftIcon={<Lock className="h-4 w-4 text-[var(--brand-primary)]" />}
                rightAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((show) => !show)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                }
                input={
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isEdit ? "new-password" : "new-password"}
                    {...register("password")}
                    aria-invalid={!!errors.password}
                    className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 pr-10 font-medium text-[var(--brand-ink)]"
                    placeholder={
                      isEdit
                        ? "Dejar en blanco para mantener la actual"
                        : "Mínimo 6 caracteres"
                    }
                  />
                }
              />
              <FormErrorMessage message={errors.password?.message} />
            </div>
          </div>
          {isProfessorRole ? <section className="space-y-4 border-t border-[var(--brand-border)] pt-5">
            <div><h3 className="font-extrabold text-[var(--brand-ink)]">Datos del perfil profesional</h3><p className="mt-1 text-sm font-medium text-[var(--brand-muted)]">Esta información se utilizará también en el módulo Profesores.</p></div>
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <div className="space-y-1"><Label className="font-extrabold text-[var(--brand-ink)]">Especialidad</Label><IconInput id="profesorEspecialidad" leftIcon={<BookOpen className="size-4 text-[var(--brand-primary)]" />} input={<Input {...register("profesorEspecialidad")} maxLength={160} className="h-11 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 font-medium text-[var(--brand-ink)]" placeholder="Ej: Educación física" />} /></div>
              <div className="space-y-1"><Label className="font-extrabold text-[var(--brand-ink)]">Matrícula</Label><IconInput id="profesorMatricula" leftIcon={<BadgeCheck className="size-4 text-[var(--brand-primary)]" />} input={<Input {...register("profesorMatricula")} maxLength={120} className="h-11 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 font-medium text-[var(--brand-ink)]" placeholder="Número de matrícula" />} /></div>
              <div className="space-y-1 sm:col-span-2"><Label className="font-extrabold text-[var(--brand-ink)]">Descripción</Label><div className="relative"><AlignLeft className="pointer-events-none absolute left-3 top-3 size-4 text-[var(--brand-primary)]" /><Textarea {...register("profesorDescripcion")} maxLength={1200} rows={4} className="min-h-28 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 font-medium text-[var(--brand-ink)]" placeholder="Formación, experiencia u observaciones profesionales" /></div></div>
            </div>
          </section> : null}
        </div> : null}
      </div>
      {footer}
    </div>
  );
}
