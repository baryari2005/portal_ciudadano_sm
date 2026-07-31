"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FieldError, FieldErrors } from "react-hook-form";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { ArrowLeft, Check, CheckCircle2, ChevronRight, ClipboardCheck, Images, KeyRound, Loader2, MapPin, Save, ShieldPlus, UserPlus, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminFormHeader } from "@/components/layout/admin-form-page";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/components/shared/admin-patterns";

import { UserFormFields } from "./UserFormFields";
import { UserFormValues } from "../types/types";
import { useUserForm } from "../hooks/useUserForm";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  defaultValues?: Partial<UserFormValues> & {
    id?: string;
    rol?: { id: number; codigo?: string; nombre?: string };
  };
  onSuccess?: (id: string) => void;
  fixedRoleCode?: string;
  backHref?: string;
  title?: string;
  description?: string;
  headerIcon?: LucideIcon;
};

type StepStatus = "pending" | "valid" | "invalid";

const STEP_FIELDS: Record<number, Array<keyof UserFormValues>> = {
  1: ["nombre", "apellido", "documento", "fechaNacimiento", "nacionalidad", "genero"],
  2: ["userId", "password", "rolId"],
  3: ["domicilio", "localidad", "provincia", "codigoPostal"],
  4: ["email", "celular", "contactoEmergenciaNombre", "contactoEmergenciaTelefono"],
  5: ["coberturaMedicaId", "numeroAfiliado"],
  6: ["avatarUrl", "fotoPerfilUrl"],
  7: [],
};

function isFieldError(value: unknown): value is FieldError {
  return (
    !!value &&
    typeof value === "object" &&
    ("message" in value || "type" in value)
  );
}

function getFirstFieldError(
  errors: FieldErrors<UserFormValues>,
): { name: string; error: FieldError } | null {
  for (const [name, value] of Object.entries(errors)) {
    if (isFieldError(value)) {
      return { name, error: value };
    }
  }

  return null;
}

export function UserForm({ mode, defaultValues, onSuccess, fixedRoleCode, backHref = "/users", title, description, headerIcon }: Props) {
  const { form, onSubmit, submitting, roles, loadingRoles, identityTmpPath, avatarTmpPath, setIdentityTmpPath, setAvatarTmpPath } =
    useUserForm({ mode, defaultValues, onSuccess });
  const [step, setStep] = useState(1);
  const submitRequestedRef = useRef(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [stepStatus, setStepStatus] = useState<Record<number, StepStatus>>({ 1: "pending", 2: "pending", 3: "pending", 4: "pending", 5: "pending", 6: "pending", 7: "pending" });
  const creating = mode === "create";
  const workflow = true;
  useEffect(() => {
    if (!fixedRoleCode || loadingRoles) return;
    const normalizedCode = fixedRoleCode.toLowerCase();
    const role = roles.find((item) => item.codigo?.toLowerCase() === normalizedCode || item.nombre.toLowerCase() === normalizedCode);
    if (role) {
      form.setValue("rolId", role.id, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
      form.clearErrors("rolId");
    }
  }, [creating, fixedRoleCode, form, loadingRoles, roles]);
  useEffect(() => {
    const subscription = form.watch((_values, info) => {
      if (!info.name) return;
      const changedStep = Object.entries(STEP_FIELDS).find(([, fields]) => fields.includes(info.name as keyof UserFormValues));
      if (changedStep) setStepStatus((current) => ({ ...current, [Number(changedStep[0])]: "pending" }));
    });
    return () => subscription.unsubscribe();
  }, [form]);
  const steps = [
    ["Datos personales", UserRound], ["Credenciales", KeyRound], ["Domicilio", MapPin],
    ["Contacto", ShieldPlus], ["Cobertura", CheckCircle2], ["Imágenes", Images],
    ["Revisión", ClipboardCheck],
  ] as const;

  async function continueToNextStep() {
    const valid = await form.trigger(STEP_FIELDS[step], { shouldFocus: true });
    setStepStatus((current) => ({ ...current, [step]: valid ? "valid" : "invalid" }));
    if (!valid) {
      toast.error("Corregí los campos marcados antes de continuar.");
      return;
    }
    setStep((current) => Math.min(7, current + 1));
  }

  const formActions = (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--brand-border)] pt-5 sm:flex-row sm:justify-between">
      {step > 1 ? <Button type="button" variant="outline" className={`${adminSecondaryButtonClass} w-full justify-center gap-3 sm:w-auto`} onClick={()=>setStep((current)=>current-1)}><ArrowLeft className="h-5 w-5"/>Anterior</Button> : <Button asChild type="button" variant="outline" className={`${adminSecondaryButtonClass} w-full justify-center gap-3 sm:w-auto`}><Link href={backHref}><ArrowLeft className="h-5 w-5"/>Volver</Link></Button>}
      {step < 7 ? <Button type="button" size="lg" disabled={submitting || mediaUploading || loadingRoles} onClick={continueToNextStep} className={`${adminPrimaryButtonClass} w-full justify-center gap-3 sm:w-auto`}>Guardar y continuar<ChevronRight className="h-5 w-5" /></Button> : <Button type="submit" size="lg" disabled={submitting || mediaUploading || loadingRoles} onClick={() => { submitRequestedRef.current = true; }} className={`${adminPrimaryButtonClass} w-full justify-center gap-3 sm:w-auto`}>{submitting || mediaUploading ? <Loader2 className="animate-spin" /> : null}Guardar cambios<Save /></Button>}
    </div>
  );

  useEffect(() => {
    if (
      process.env.NODE_ENV === "development" &&
      Object.keys(form.formState.errors).length > 0
    ) {
      console.log("[RHF] errors", form.formState.errors);
    }
  }, [form.formState.errors]);

  const onInvalid = (errors: FieldErrors<UserFormValues>) => {
    if (process.env.NODE_ENV === "development") {
      console.log("[RHF] onInvalid", errors);
    }

    setStepStatus(
      Object.fromEntries(
        Object.entries(STEP_FIELDS).map(([number, fields]) => [
          Number(number),
          fields.some((field) => Boolean(errors[field])) ? "invalid" : "valid",
        ]),
      ) as Record<number, StepStatus>,
    );

    const first = getFirstFieldError(errors);

    if (!first) {
      toast.error("Revisá los campos del formulario.");
      return;
    }

    const { name, error } = first;
    if (workflow) {
      const credentialFields = new Set(["userId", "password", "rolId"]);
      const addressFields = new Set(["domicilio", "localidad", "provincia", "codigoPostal"]);
      const contactFields = new Set(["email", "celular", "contactoEmergenciaNombre", "contactoEmergenciaTelefono"]);
      const coverageFields = new Set(["coberturaMedicaId", "numeroAfiliado"]);
      setStep(credentialFields.has(name) ? 2 : addressFields.has(name) ? 3 : contactFields.has(name) ? 4 : coverageFields.has(name) ? 5 : 1);
    }
    const invalidStep = Object.entries(STEP_FIELDS).find(([, fields]) => fields.includes(name as keyof UserFormValues));
    if (invalidStep) {
      const number = Number(invalidStep[0]);
      setStep(number);
      setStepStatus((current) => ({ ...current, [number]: "invalid" }));
    }
    const msg =
      typeof error.message === "string"
        ? error.message
        : `Revisá el campo: ${name}`;

    toast.error(msg);

    const element =
      (document.querySelector(`[name="${name}"]`) as HTMLElement | null) ??
      (error.ref as HTMLElement | undefined) ??
      (document.getElementById(name) as HTMLElement | null);

    element?.focus?.();
  };

  const HeaderIcon = headerIcon ?? (creating ? UserPlus : UserRound);

  return (
    <>
    <AdminFormHeader
      icon={HeaderIcon}
      title={title ?? (creating ? "Alta de ciudadano" : "Editar ciudadano")}
      description={description ?? "Completá y validá cada sección antes de guardar los cambios."}
      className="mb-5"
    />
    <form
      id="user-form"
      className="w-full"
      onSubmit={(event) => { if (step !== 7 || mediaUploading || !submitRequestedRef.current) { event.preventDefault(); return; } submitRequestedRef.current = false; void form.handleSubmit(async (values) => { setStepStatus({ 1: "valid", 2: "valid", 3: "valid", 4: "valid", 5: "valid", 6: "valid", 7: "valid" }); await onSubmit(values); }, onInvalid)(event); }}
      noValidate
    >
      <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="h-fit self-start rounded-3xl bg-[#1D4F36] p-4 text-white shadow-sm lg:sticky lg:top-0"><p className="px-3 pb-3 text-xs font-bold uppercase text-[#BFD0C5]">{creating ? "Pasos del alta" : "Pasos de edición"}</p><nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">{steps.map(([label, Icon], index) => { const number=index+1, active=step===number, status=stepStatus[number]; return <button key={label} type="button" onClick={()=>setStep(number)} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold ${active?"bg-[#DDF28A] text-[#173C2A]":"hover:bg-white/10"}`}><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10"><Icon className="size-5"/></span><span className="min-w-0 flex-1">{label}</span>{status === "valid" ? <Check className="size-5 text-emerald-300" /> : status === "invalid" ? <X className="size-5 text-red-300" /> : null}</button>})}</nav></aside>
      <UserFormFields
        mode={mode}
        form={form}
        roles={roles}
        loadingRoles={loadingRoles}
        currentAvatarUrl={defaultValues?.fotoPerfilUrl || null}
        onTempAvatarUploaded={setIdentityTmpPath}
        onTempAvatarCleared={() => setIdentityTmpPath(null)}
        onTempPortalAvatarUploaded={setAvatarTmpPath}
        step={step}
        footer={formActions}
        fixedRoleLabel={fixedRoleCode ? "Ciudadano" : undefined}
        hasPortalAvatar={Boolean(avatarTmpPath || defaultValues?.avatarUrl)}
        hasIdentityPhoto={Boolean(identityTmpPath || defaultValues?.fotoPerfilUrl)}
        onMediaUploadingChange={setMediaUploading}
      />
      </div>

    </form>
    </>
  );
}
