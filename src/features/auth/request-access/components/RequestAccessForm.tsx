"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { FieldErrors } from "react-hook-form";
import { Controller } from "react-hook-form";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  CalendarIcon,
  CakeSlice,
  ChevronRight,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Images,
  KeyRound,
  Contact,
  HeartPulse,
  IdCard,
  Map,
  MapPinned,
  LogIn,
  MapPin,
  Send,
  User,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DocumentNumberInput } from "@/components/forms/DocumentNumberInput";
import { EmailInput } from "@/components/forms/EmailInput";
import { Form } from "@/components/ui/form";
import { IconInput } from "@/components/forms/IconInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/forms/PhoneInput";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useRequestAccessForm } from "../hooks/useRequestAccessForm";
import type { RequestAccessFormValues } from "../schemas/requestAccessSchema";
import { RequestAccessPhotoField } from "./RequestAccessPhotoField";
import { GoogleAddressInput } from "@/components/forms/GoogleAddressInput";
import { MedicalCoverageSelect } from "@/features/medical-coverages/components/MedicalCoverageSelect";
import { adminControlClass, adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/components/shared/admin-patterns";
import { GENERO_OPCIONES } from "@/constants/genero";
import { NACIONALIDAD_VALUES } from "@/constants/nacionalidad";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ARGENTINA_PROVINCES } from "@/constants/argentina-locations";

const inputClass = `${adminControlClass} pl-9`;

const titleCaseEs = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(
      /([a-záéíóúüñ]+)([a-záéíóúüñ'-]*)/gi,
      (_match, first: string, rest: string) =>
        first.charAt(0).toUpperCase() + first.slice(1) + rest,
    );

function fromYmdLocal(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function toYmdLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function FormError({ message }: { message?: unknown }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-red-600">{String(message)}</p>;
}

function getFirstError(errors: FieldErrors<RequestAccessFormValues>) {
  for (const [name, error] of Object.entries(errors)) {
    if (error && typeof error === "object" && "message" in error) {
      return {
        name,
        message:
          typeof error.message === "string"
            ? error.message
            : `Revisá el campo: ${name}`,
      };
    }
  }

  return null;
}

const REQUEST_STEPS = [
  { title: "Datos personales", description: "Completá tu identidad y fecha de nacimiento." },
  { title: "Credenciales", description: "Definí el usuario y la contraseña con los que vas a ingresar." },
  { title: "Domicilio", description: "Informá dirección, localidad, provincia y código postal." },
  { title: "Contacto", description: "Completá tus datos de contacto y la referencia de emergencia." },
  { title: "Cobertura médica", description: "Informá tu obra social o prepaga, si corresponde." },
  { title: "Imágenes", description: "Cargá el avatar del portal y tu foto para validar la identidad." },
  { title: "Revisión", description: "Revisá la información antes de enviar la solicitud de acceso." },
] as const;

const STEP_ICONS = [UserRound, KeyRound, MapPin, User, ClipboardCheck, Images, CheckCircle2] as const;

function RequestAccessSteps({
  currentStep,
  completed,
  onSelect,
}: {
  currentStep: number;
  completed: boolean[];
  onSelect: (step: number) => void;
}) {
  return (
    <aside className="h-fit self-start rounded-3xl bg-[#1D4F36] p-3 text-white shadow-sm lg:sticky lg:top-0 lg:p-4">
      <p className="px-3 pb-3 pt-1 text-xs font-bold uppercase tracking-wide text-[#BFD0C5]">
        Pasos de la solicitud
      </p>
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1" aria-label="Pasos de la solicitud">
        {REQUEST_STEPS.map((item, index) => {
          const number = index + 1;
          const Icon = STEP_ICONS[index];
          const active = currentStep === number;
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => onSelect(number)}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors ${active ? "bg-[#DDF28A] text-[#173C2A]" : "text-white hover:bg-white/10"}`}
              aria-current={active ? "step" : undefined}
            >
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-white/55" : "bg-white/10"}`}>
                {completed[index] ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}
              </span>
              <span className="hidden sm:block lg:block">{item.title}</span>
              <span className="sm:hidden">Paso {number}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function ReviewItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-[#D7E3D1] bg-[#F8FBF6] px-4 py-3">
      <p className="text-xs font-bold uppercase text-[#819B56]">{label}</p>
      <p className="mt-1 font-semibold text-[#173C2A]">{value || "No informado"}</p>
    </div>
  );
}

function RequestAccessReview({ values }: { values: RequestAccessFormValues }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewItem label="Nombre completo" value={`${values.nombre || ""} ${values.apellido || ""}`.trim()} />
        <ReviewItem label="DNI" value={values.dni} />
        <ReviewItem label="Email" value={values.email} />
        <ReviewItem label="Teléfono" value={values.telefono} />
        <ReviewItem label="Dirección" value={values.direccion} />
        <ReviewItem label="Contacto de emergencia" value={values.contactoEmergenciaNombre} />
        <ReviewItem label="Usuario" value={values.userId} />
        <ReviewItem label="Imágenes" value={`${values.avatarTmpPath ? "Avatar cargado" : "Sin avatar"} · ${values.profilePhotoTmpPath ? "Foto de identidad cargada" : "Sin foto de identidad"}`} />
      </div>
      <div className="flex gap-3 rounded-xl border border-[#C9D9C3] bg-white/60 p-4 text-sm text-[#4D6257]">
        <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-[#1D4F36]" />
        <p>Al enviar la solicitud, un administrador revisará los datos antes de habilitar el acceso.</p>
      </div>
    </div>
  );
}

export function RequestAccessForm() {
  const { form, onSubmit, successMessage, errorMessage } =
    useRequestAccessForm();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const submitRequestedRef = useRef(false);

  const {
    register,
    setValue,
    trigger,
    control,
    formState: { errors, isSubmitting },
  } = form;

  const onInvalid = (formErrors: FieldErrors<RequestAccessFormValues>) => {
    const first = getFirstError(formErrors);

    if (!first) {
      toast.error("Revisá los campos del formulario.");
      return;
    }

    const accessFields = new Set(["userId", "password"]);
    const addressFields = new Set(["direccion", "localidad", "provincia", "codigoPostal"]);
    const contactFields = new Set(["email", "telefono", "contactoEmergenciaNombre", "contactoEmergenciaTelefono"]);
    const coverageFields = new Set(["coberturaMedicaId", "numeroAfiliado"]);
    const photoFields = new Set(["avatarTmpPath", "profilePhotoTmpPath"]);
    setStep(accessFields.has(first.name) ? 2 : addressFields.has(first.name) ? 3 : contactFields.has(first.name) ? 4 : coverageFields.has(first.name) ? 5 : photoFields.has(first.name) ? 6 : 1);

    toast.error(first.message);

    const element =
      (document.querySelector(
        `[name="${first.name}"]`,
      ) as HTMLElement | null) ??
      (document.getElementById(first.name) as HTMLElement | null);

    element?.focus?.();
  };

  const personalFields: Array<keyof RequestAccessFormValues> = ["nombre", "apellido", "dni", "fechaNacimiento", "genero", "nacionalidad"];
  const accessFields: Array<keyof RequestAccessFormValues> = ["userId", "password"];
  const addressFields: Array<keyof RequestAccessFormValues> = ["direccion", "localidad", "provincia", "codigoPostal"];
  const contactFields: Array<keyof RequestAccessFormValues> = ["email", "telefono", "contactoEmergenciaNombre", "contactoEmergenciaTelefono"];
  const values = form.watch();
  const fieldsComplete = (fields: Array<keyof RequestAccessFormValues>) => fields.every((field) => Boolean(String(values[field] ?? "").trim()));
  const personalComplete = fieldsComplete(personalFields);
  const addressComplete = fieldsComplete(addressFields);
  const contactComplete = fieldsComplete(contactFields);
  const photosComplete = Boolean(values.avatarTmpPath && values.profilePhotoTmpPath);
  const accessComplete = Boolean(values.userId?.trim() && values.password);
  const age = values.fechaNacimiento ? Math.max(0, new Date(Date.now() - fromYmdLocal(values.fechaNacimiento).getTime()).getUTCFullYear() - 1970) : null;

  async function nextStep() {
    const fields = step === 1 ? personalFields : step === 2 ? accessFields : step === 3 ? addressFields : step === 4 ? contactFields : [];
    if (fields.length && !(await trigger(fields))) return;
    setStep((current) => Math.min(current + 1, 7));
  }

  if (successMessage) {
    return (
      <div className="rounded-[24px] border border-[#DDE8D7] bg-[#EEF6E9] p-6 text-[#173C2A] shadow-sm lg:p-8">
        <div className="rounded-xl border border-[#C7D8BE] bg-[#F3F7EF] px-4 py-4 text-[#003A22]">
          <div className="flex gap-3">
            <CheckCircle2
              className="mt-0.5 size-5 shrink-0 text-[#1D4F36]"
              aria-hidden="true"
            />
            <p className="text-sm font-medium leading-6">{successMessage}</p>
          </div>
        </div>

        <Button
          asChild
          className="mt-6 h-12 w-full rounded-xl bg-[#003A22] text-base font-bold text-white hover:bg-[#1D4F36] sm:w-auto"
        >
          <Link href="/login">
            <LogIn className="size-5" aria-hidden="true" />
            Volver al inicio de sesión
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        className="w-full"
        onSubmit={(event) => {
          if (step !== 7 || !submitRequestedRef.current) {
            event.preventDefault();
            return;
          }
          submitRequestedRef.current = false;
          void form.handleSubmit(onSubmit, onInvalid)(event);
        }}
        noValidate
      >
        <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <RequestAccessSteps
            currentStep={step}
            completed={[personalComplete, accessComplete, addressComplete, contactComplete, true, photosComplete, false]}
            onSelect={setStep}
          />
          <div className="rounded-3xl border border-[var(--brand-secondary)]/20 bg-white/80 p-5 text-[var(--brand-ink)] shadow-sm sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between border-b border-[#C9D9C3] pb-5">
            <div>
              <h2 className="text-lg font-extrabold text-[#003A22]">
                {REQUEST_STEPS[step - 1].title}
              </h2>
              <p className="mt-1 text-sm font-medium text-[#5F6F68]">
                {REQUEST_STEPS[step - 1].description}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {[1, 3, 4, 5].includes(step) ? <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {step === 1 ? <>
              <div className="space-y-1">
                <Label className="font-extrabold text-[#173C2A]">
                  Nombre *
                </Label>
                <IconInput
                  id="nombre"
                  leftIcon={<User className="h-4 w-4 text-[#1D4F36]" />}
                  input={
                    <Input
                      id="nombre"
                      {...register("nombre", {
                        onBlur: (event) =>
                          setValue("nombre", titleCaseEs(event.target.value), {
                            shouldDirty: true,
                            shouldValidate: true,
                          }),
                      })}
                      className={inputClass}
                      placeholder="Ej: Juan"
                    />
                  }
                />
                <FormError message={errors.nombre?.message} />
              </div>

              <div className="space-y-1">
                <Label className="font-extrabold text-[#173C2A]">
                  Apellido *
                </Label>
                <IconInput
                  id="apellido"
                  leftIcon={<UserRound className="h-4 w-4 text-[#1D4F36]" />}
                  input={
                    <Input
                      id="apellido"
                      {...register("apellido", {
                        onBlur: (event) =>
                          setValue(
                            "apellido",
                            titleCaseEs(event.target.value),
                            {
                              shouldDirty: true,
                              shouldValidate: true,
                            },
                          ),
                      })}
                      className={inputClass}
                      placeholder="Ej: Pérez"
                    />
                  }
                />
                <FormError message={errors.apellido?.message} />
              </div>

              <div className="space-y-1">
                <Label className="font-extrabold text-[#173C2A]">DNI *</Label>
                <Controller
                  control={control}
                  name="dni"
                  render={({ field }) => (
                    <DocumentNumberInput
                      id="dni"
                      value={field.value ?? ""}
                      onChange={(value) => field.onChange(value)}
                      onBlur={field.onBlur}
                      className={inputClass}
                      required
                    />
                  )}
                />
                <FormError message={errors.dni?.message} />
              </div>

              <div className="space-y-1">
                <Label className="font-extrabold text-[#173C2A]">
                  Fecha de nacimiento *
                </Label>
                <Controller
                  control={control}
                  name="fechaNacimiento"
                  render={({ field }) => {
                    const raw = field.value;
                    const dateValue = raw ? fromYmdLocal(raw) : undefined;

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
                            onSelect={(date) =>
                              field.onChange(date ? toYmdLocal(date) : "")
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
                <FormError message={errors.fechaNacimiento?.message} />
              </div>

              <div className="space-y-1">
                <Label className="font-extrabold text-[#173C2A]">Edad</Label>
                <IconInput id="edad" leftIcon={<CakeSlice className="size-4 text-[#1D4F36]" />} input={<Input value={age === null ? "Se calcula con la fecha de nacimiento" : `${age} años`} readOnly className={`${adminControlClass} w-full pl-9`} />} />
              </div>
              <div className="space-y-1">
                <Label className="font-extrabold text-[#173C2A]">Nacionalidad *</Label>
                <Controller control={control} name="nacionalidad" render={({ field }) => <IconInput id="nacionalidad" leftIcon={<Map className="size-4 text-[#1D4F36]" />} input={<Select value={field.value} onValueChange={field.onChange}><SelectTrigger className={`${adminControlClass} w-full pl-9`}><SelectValue /></SelectTrigger><SelectContent>{NACIONALIDAD_VALUES.map((item) => <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>} />} />
                <FormError message={errors.nacionalidad?.message} />
              </div>
              <div className="space-y-1">
                <Label className="font-extrabold text-[#173C2A]">Sexo / género *</Label>
                <Controller control={control} name="genero" render={({ field }) => <IconInput id="genero" leftIcon={<UserRound className="size-4 text-[#1D4F36]" />} input={<Select value={field.value} onValueChange={field.onChange}><SelectTrigger className={`${adminControlClass} w-full pl-9`}><SelectValue /></SelectTrigger><SelectContent>{GENERO_OPCIONES.map((item) => <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>} />} />
                <FormError message={errors.genero?.message} />
              </div>
              </> : null}

              {step === 3 ? <>

              <div className="space-y-1 sm:col-span-2">
                <Label className="font-extrabold text-[#173C2A]">
                  Dirección *
                </Label>
                <Controller control={control} name="direccion" render={({field})=><GoogleAddressInput id="direccion" value={field.value??""} placeId={form.watch("direccionPlaceId")} onChange={(location)=>{field.onChange(location.address);setValue("direccionPlaceId",location.placeId??"");setValue("direccionLat",location.lat);setValue("direccionLng",location.lng)}} className={inputClass} placeholder="Ej: Av. Presidente Perón 1234"/>}/>
                <FormError message={errors.direccion?.message} />
              </div>

              <div className="space-y-1"><Label className="font-extrabold text-[#173C2A]">Localidad *</Label><IconInput id="localidad" leftIcon={<MapPinned className="size-4 text-[#1D4F36]" />} input={<Input {...register("localidad")} className={`${adminControlClass} w-full pl-9`} />} /><FormError message={errors.localidad?.message} /></div>
              <div className="space-y-1"><Label className="font-extrabold text-[#173C2A]">Provincia *</Label><Controller control={control} name="provincia" render={({field})=><IconInput id="provincia" leftIcon={<Map className="size-4 text-[#1D4F36]" />} input={<Select value={field.value} onValueChange={field.onChange}><SelectTrigger className={`${adminControlClass} w-full pl-9`}><SelectValue placeholder="Seleccionar provincia"/></SelectTrigger><SelectContent>{ARGENTINA_PROVINCES.map(item=><SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>} />}/><FormError message={errors.provincia?.message} /></div>
              <div className="space-y-1"><Label className="font-extrabold text-[#173C2A]">Código postal *</Label><IconInput id="codigoPostal" leftIcon={<IdCard className="size-4 text-[#1D4F36]" />} input={<Input {...register("codigoPostal")} className={`${adminControlClass} w-full pl-9`} />} /><FormError message={errors.codigoPostal?.message} /></div>
              </> : null}

              {step === 4 ? <>

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
                      className={inputClass}
                      required
                    />
                  )}
                />
                <FormError message={errors.email?.message} />
              </div>

              <div className="space-y-1">
                <Label className="font-extrabold text-[#173C2A]">
                  Teléfono *
                </Label>
                <Controller
                  control={control}
                  name="telefono"
                  render={({ field }) => (
                    <PhoneInput
                      id="telefono"
                      value={field.value ?? ""}
                      onChange={(value) => field.onChange(value)}
                      onBlur={field.onBlur}
                      className={inputClass}
                      required
                    />
                  )}
                />
                <FormError message={errors.telefono?.message} />
              </div>
              <div className="space-y-1"><Label className="font-extrabold text-[#173C2A]">Persona de contacto de emergencia *</Label><IconInput id="contactoEmergenciaNombre" leftIcon={<Contact className="size-4 text-[#1D4F36]" />} input={<Input {...register("contactoEmergenciaNombre")} className={`${adminControlClass} w-full pl-9`} placeholder="Nombre y apellido"/>} /><FormError message={errors.contactoEmergenciaNombre?.message}/></div>
              <div className="space-y-1"><Label className="font-extrabold text-[#173C2A]">Teléfono de emergencia *</Label><Controller control={control} name="contactoEmergenciaTelefono" render={({field})=><PhoneInput id="contactoEmergenciaTelefono" value={field.value??""} onChange={field.onChange} onBlur={field.onBlur} className={inputClass} required/>}/><FormError message={errors.contactoEmergenciaTelefono?.message}/></div>
              </> : null}
              {step === 5 ? <>
              <div className="space-y-1 sm:col-span-2"><Label className="font-extrabold text-[#173C2A]">Obra social o prepaga</Label><Controller control={control} name="coberturaMedicaId" render={({field})=><IconInput id="coberturaMedicaId" leftIcon={<HeartPulse className="size-4 text-[#1D4F36]" />} input={<MedicalCoverageSelect value={field.value} onChange={field.onChange} publicAccess triggerClassName="pl-9"/>} />} /></div>
              <div className="space-y-1 sm:col-span-2"><Label className="font-extrabold text-[#173C2A]">Número de afiliado</Label><IconInput id="numeroAfiliado" leftIcon={<IdCard className="size-4 text-[#1D4F36]" />} input={<Input {...register("numeroAfiliado")} className={`${adminControlClass} w-full pl-9`} placeholder="Número de afiliación"/>} /></div>
              </> : null}
            </div> : null}

            {step === 6 ? <div className="space-y-5"><RequestAccessPhotoField
              disabled={isSubmitting}
              title="Avatar"
              description="Elegí la imagen que querés mostrar en todo el portal. No modifica tu foto de identidad."
              allowCamera={false}
              onUploaded={({ tmpPath }) =>
                setValue("avatarTmpPath", tmpPath, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              onClear={() =>
                setValue("avatarTmpPath", "", {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />

            <RequestAccessPhotoField
              disabled={isSubmitting}
              title="Foto de identidad"
              description="Esta foto será utilizada por recepción para comprobar visualmente tu identidad."
              onUploaded={({ tmpPath }) =>
                setValue("profilePhotoTmpPath", tmpPath, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              onClear={() =>
                setValue("profilePhotoTmpPath", "", {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            /></div> : null}

            {step === 2 ? <div className="space-y-4">
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="font-extrabold text-[#173C2A]">
                    User ID *
                  </Label>
                  <IconInput id="userId" leftIcon={<User className="size-4 text-[#1D4F36]" />} input={<Input {...register("userId")} className={`${adminControlClass} w-full pl-9`} autoComplete="username" placeholder="Ej: jperez" />} />
                  <FormError message={errors.userId?.message} />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="font-extrabold text-[#173C2A]">
                    Contraseña *
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
                          showPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
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
                        autoComplete="new-password"
                        {...register("password")}
                        aria-invalid={!!errors.password}
                        className={`${adminControlClass} pl-9 pr-10`}
                        placeholder="Mínimo 6 caracteres"
                      />
                    }
                  />
                  <FormError message={errors.password?.message} />
                </div>
              </div>
            </div> : null}

            {step === 7 ? <RequestAccessReview values={values} /> : null}

            {errorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            ) : null}
          </div>
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--brand-border)] pt-5 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className={`${adminSecondaryButtonClass} w-full justify-center gap-3 sm:w-auto`}
            onClick={() => step > 1 && setStep((current) => current - 1)}
            asChild={step === 1}
          >
            {step === 1 ? <Link href="/login">
              <ArrowLeft className="h-5 w-5" />
              Volver
            </Link> : <><ArrowLeft className="h-5 w-5" />Anterior</>}
          </Button>

          {step < 7 ? <Button
            type="button"
            size="lg"
            className={`${adminPrimaryButtonClass} w-full justify-center gap-3 sm:w-auto`}
            onClick={nextStep}
          >
            Guardar y continuar
            <ChevronRight className="h-5 w-5" />
          </Button> : <Button
            type="submit"
            size="lg"
            className={`${adminPrimaryButtonClass} w-full justify-center gap-3 sm:w-auto`}
            disabled={isSubmitting}
            aria-disabled={isSubmitting}
            onClick={() => {
              submitRequestedRef.current = true;
            }}
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={18} />
                Enviando...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Send className="h-4 w-4" />
                Enviar solicitud
              </span>
            )}
          </Button>}
        </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
