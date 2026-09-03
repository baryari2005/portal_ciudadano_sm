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
  MapPin,
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
      <p className="text-xs font-bold uppercase text-[#819B56]">{label}</p>
      <p className="mt-1 font-semibold text-[#173C2A]">{value || "No informado"}</p>
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
  const sectionMeta = step ? [
    ["Datos personales", "Identidad, fecha de nacimiento y datos demográficos."],
    ["Credenciales", "Usuario, contraseña y rol de acceso."],
    ["Domicilio", "Dirección, localidad, provincia y código postal."],
    ["Contacto", "Datos de contacto y referencia de emergencia."],
    ["Cobertura médica", "Obra social o prepaga y número de afiliado."],
    ["Imágenes", "Avatar del portal y foto para comprobar la identidad."],
  ][step - 1] : ["Datos del usuario", "Información requerida para registrar el acceso al sistema."];

  return (
    <div className="rounded-3xl border border-[var(--brand-secondary)]/20 bg-white/80 p-5 text-[var(--brand-ink)] shadow-sm sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between border-b border-[#C9D9C3] pb-5">
        <div>
          <h2 className="text-lg font-extrabold text-[#003A22]">
            {sectionMeta?.[0] ?? "Revisión"}
          </h2>
          <p className="mt-1 text-sm font-medium text-[#5F6F68]">
            {sectionMeta?.[1] ?? "Verificá que todas las secciones estén completas antes de guardar."}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {step == null || (step != null && [1, 3, 4, 5].includes(step)) ? <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {show(1) ? <>
          <div className="space-y-1">
            <Label className="font-extrabold text-[#173C2A]">Nombre *</Label>
            <IconInput
              id="nombre"
              leftIcon={<User className="h-4 w-4 text-[#1D4F36]" />}
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
                  className="h-11 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9 font-medium text-[#173C2A]"
                  placeholder="Ej: Juan"
                />
              }
            />
            <FormErrorMessage message={errors.nombre?.message} />
          </div>

          <div className="space-y-1">
            <Label className="font-extrabold text-[#173C2A]">Apellido *</Label>
            <IconInput
              id="apellido"
              leftIcon={<UserRound className="h-4 w-4 text-[#1D4F36]" />}
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
                  className="h-11 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9 font-medium text-[#173C2A]"
                  placeholder="Ej: Pérez"
                />
              }
            />
            <FormErrorMessage message={errors.apellido?.message} />
          </div>

          <div className="space-y-1">
            <Label className="font-extrabold text-[#173C2A]">DNI *</Label>
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
                  className="h-11 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9 font-medium text-[#173C2A]"
                  required
                />
              )}
            />
            <FormErrorMessage message={errors.documento?.message} />
          </div>

          <div className="space-y-1">
            <Label className="font-extrabold text-[#173C2A]">
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
                        className="h-11 w-full justify-start rounded-xl border-[#C9D9C3] bg-[#F7FBF5] font-medium text-[#173C2A]"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-[#1D4F36]" />
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

          <div className="space-y-1"><Label className="font-extrabold text-[#173C2A]">Edad</Label><IconInput id="edad" leftIcon={<CakeSlice className="size-4 text-[#1D4F36]"/>} input={<Input readOnly value={age === null ? "Se calcula automáticamente" : `${age} años`} className="h-11 w-full rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9"/>}/></div>
          <div className="space-y-1"><Label className="font-extrabold text-[#173C2A]">Nacionalidad *</Label><Controller control={control} name="nacionalidad" render={({field})=><IconInput id="nacionalidad" leftIcon={<Map className="size-4 text-[#1D4F36]"/>} input={<Select value={field.value} onValueChange={field.onChange}><SelectTrigger className="h-11 w-full rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9"><SelectValue placeholder="Seleccionar"/></SelectTrigger><SelectContent>{NACIONALIDAD_VALUES.map(item=><SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>}/>} /></div>
          <div className="space-y-1"><Label className="font-extrabold text-[#173C2A]">Sexo / género *</Label><Controller control={control} name="genero" render={({field})=><IconInput id="genero" leftIcon={<UserRound className="size-4 text-[#1D4F36]"/>} input={<Select value={field.value} onValueChange={field.onChange}><SelectTrigger className="h-11 w-full rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9"><SelectValue placeholder="Seleccionar"/></SelectTrigger><SelectContent>{GENERO_OPCIONES.map(item=><SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>}/>} /></div>
          </> : null}

          {show(3) ? <>

          <div className="space-y-1 sm:col-span-2">
            <Label className="font-extrabold text-[#173C2A]">Dirección *</Label>
            <Controller control={control} name="domicilio" render={({field})=><GoogleAddressInput id="domicilio" value={field.value??""} placeId={watch("domicilioPlaceId")} onChange={(location)=>{field.onChange(location.address);setValue("domicilioPlaceId",location.placeId);setValue("domicilioLat",location.lat);setValue("domicilioLng",location.lng)}} className="h-11 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9 font-medium text-[#173C2A]" placeholder="Ej: Av. Presidente Perón 1234"/>}/>
            <FormErrorMessage message={errors.domicilio?.message} />
          </div>

          <div className="space-y-1"><Label className="font-extrabold text-[#173C2A]">Localidad *</Label><IconInput id="localidad" leftIcon={<MapPinned className="size-4 text-[#1D4F36]"/>} input={<Input {...register("localidad")} className="h-11 w-full rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9"/>}/></div>
          <div className="space-y-1"><Label className="font-extrabold text-[#173C2A]">Provincia *</Label><Controller control={control} name="provincia" render={({field}) => <IconInput id="provincia" leftIcon={<Map className="size-4 text-[#1D4F36]"/>} input={<Select value={field.value} onValueChange={field.onChange}><SelectTrigger className="h-11 w-full rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9"><SelectValue placeholder="Seleccionar provincia"/></SelectTrigger><SelectContent>{ARGENTINA_PROVINCES.map(item=><SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>} />} /></div>
          <div className="space-y-1"><Label className="font-extrabold text-[#173C2A]">Código postal *</Label><IconInput id="codigoPostal" leftIcon={<IdCard className="size-4 text-[#1D4F36]"/>} input={<Input {...register("codigoPostal")} className="h-11 w-full rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9"/>}/></div>
          </> : null}

          {show(4) ? <>

          <div className="space-y-1">
            <Label className="font-extrabold text-[#173C2A]">Email *</Label>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <EmailInput
                  id="email"
                  value={field.value ?? ""}
                  onChange={(value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  className="h-11 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9 font-medium text-[#173C2A]"
                  required
                />
              )}
            />
            <FormErrorMessage message={errors.email?.message} />
          </div>

          <div className="space-y-1">
            <Label className="font-extrabold text-[#173C2A]">Telefono *</Label>
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
                  className="h-11 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9 font-medium text-[#173C2A]"
                  required
                />
              )}
            />
            <FormErrorMessage message={errors.celular?.message} />
          </div>
          <div className="space-y-1"><Label className="font-extrabold text-[#173C2A]">Persona de contacto de emergencia</Label><IconInput id="contactoEmergenciaNombre" leftIcon={<Contact className="size-4 text-[#1D4F36]"/>} input={<Input {...register("contactoEmergenciaNombre")} className="h-11 w-full rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9" placeholder="Nombre y apellido"/>}/></div>
          <div className="space-y-1"><Label className="font-extrabold text-[#173C2A]">Teléfono de emergencia</Label><Controller control={control} name="contactoEmergenciaTelefono" render={({field})=><PhoneInput id="contactoEmergenciaTelefono" value={field.value??""} onChange={field.onChange} onBlur={field.onBlur} className="h-11 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9"/>}/></div>
          </> : null}
          {show(5) ? <>
          <div className="space-y-1 sm:col-span-2"><Label className="font-extrabold text-[#173C2A]">Obra social o prepaga</Label><Controller control={control} name="coberturaMedicaId" render={({field})=><IconInput id="coberturaMedicaId" leftIcon={<HeartPulse className="size-4 text-[#1D4F36]"/>} input={<MedicalCoverageSelect value={field.value} onChange={field.onChange} triggerClassName="pl-9"/>}/>} /></div>
          <div className="space-y-1 sm:col-span-2"><Label className="font-extrabold text-[#173C2A]">Número de afiliado</Label><IconInput id="numeroAfiliado" leftIcon={<IdCard className="size-4 text-[#1D4F36]"/>} input={<Input {...register("numeroAfiliado")} className="h-11 w-full rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9"/>}/></div>
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
          <div className="flex gap-3 rounded-xl border border-[#C9D9C3] bg-white/60 p-4 text-sm text-[#4D6257]">
            <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-[#1D4F36]" />
            <p>Al guardar se validarán nuevamente todas las secciones. Si existe un error, volverás automáticamente al paso correspondiente.</p>
          </div>
        </div> : null}

        {show(2) ? <div className="space-y-4">
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="font-extrabold text-[#173C2A]">User ID *</Label>
              <IconInput id="userId" leftIcon={<User className="size-4 text-[#1D4F36]"/>} input={<Input
                {...register("userId")}
                readOnly={isEdit}
                aria-readonly={isEdit}
                className="h-11 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-10 font-medium text-[#173C2A]"
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

            <div className="space-y-1">
              <Label className="font-extrabold text-[#173C2A]">Rol *</Label>
              {fixedRoleLabel ? <IconInput id="rolId" leftIcon={<IdCard className="size-4 text-[#1D4F36]" />} input={<Input value={fixedRoleLabel} readOnly className="h-11 rounded-xl border-[#C9D9C3] bg-[#EEF6E9] pl-9 font-medium text-[#173C2A]" />} /> : <IconInput id="rolId" leftIcon={<IdCard className="size-4 text-[#1D4F36]"/>} input={<RoleSelect
                value={rolValue == null ? "" : String(rolValue)}
                onChange={(v) =>
                  setValue("rolId", Number(v), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                roles={roles}
                disabled={loadingRoles || isSubmitting}
                triggerClassName="h-11 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9 font-medium text-[#173C2A]"
              />}/>}<FormErrorMessage message={errors.rolId?.message} />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label className="font-extrabold text-[#173C2A]">
                {isEdit ? (
                  <>
                    Nueva contraseña{" "}
                    <span className="text-xs text-[#5F6F68]">(opcional)</span>
                  </>
                ) : (
                  "Contraseña *"
                )}
              </Label>
              <IconInput
                id="password"
                leftIcon={<Lock className="h-4 w-4 text-[#1D4F36]" />}
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
                    className="h-11 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9 pr-10 font-medium text-[#173C2A]"
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
          {isProfessorRole ? <section className="space-y-4 border-t border-[#C9D9C3] pt-5">
            <div><h3 className="font-extrabold text-[#173C2A]">Datos del perfil profesional</h3><p className="mt-1 text-sm font-medium text-[#5F6F68]">Esta información se utilizará también en el módulo Profesores.</p></div>
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <div className="space-y-1"><Label className="font-extrabold text-[#173C2A]">Especialidad</Label><IconInput id="profesorEspecialidad" leftIcon={<BookOpen className="size-4 text-[#1D4F36]" />} input={<Input {...register("profesorEspecialidad")} maxLength={160} className="h-11 w-full rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9 font-medium text-[#173C2A]" placeholder="Ej: Educación física" />} /></div>
              <div className="space-y-1"><Label className="font-extrabold text-[#173C2A]">Matrícula</Label><IconInput id="profesorMatricula" leftIcon={<BadgeCheck className="size-4 text-[#1D4F36]" />} input={<Input {...register("profesorMatricula")} maxLength={120} className="h-11 w-full rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9 font-medium text-[#173C2A]" placeholder="Número de matrícula" />} /></div>
              <div className="space-y-1 sm:col-span-2"><Label className="font-extrabold text-[#173C2A]">Descripción</Label><div className="relative"><AlignLeft className="pointer-events-none absolute left-3 top-3 size-4 text-[#1D4F36]" /><Textarea {...register("profesorDescripcion")} maxLength={1200} rows={4} className="min-h-28 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9 font-medium text-[#173C2A]" placeholder="Formación, experiencia u observaciones profesionales" /></div></div>
            </div>
          </section> : null}
        </div> : null}
      </div>
      {footer}
    </div>
  );
}
