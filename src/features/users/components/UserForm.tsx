"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FieldError, FieldErrors } from "react-hook-form";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ChevronRight, ClipboardCheck, Images, KeyRound, Loader2, MapPin, Save, ShieldPlus, Trash2, UserPlus, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminFormHeader } from "@/components/layout/admin-form-page";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/components/shared/admin-patterns";
import { AdminFormViewToggle } from "@/components/shared/admin-form-view-toggle";
import { AdminWorkflowLayout } from "@/components/shared/admin-workflow-layout";

import { UserFormFields } from "./UserFormFields";
import { UserFormValues } from "../types/types";
import { useUserForm, type UserSubmissionMode } from "../hooks/useUserForm";
import { deleteUserDraft, getUserDraft, saveUserDraft, type DraftStepStatus } from "../services/user-drafts.service";

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
  submissionMode?: UserSubmissionMode;
  submitLabel?: string;
  successMessage?: string;
};

type StepStatus = DraftStepStatus;

const STEP_FIELDS: Record<number, Array<keyof UserFormValues>> = {
  1: ["nombre", "apellido", "documento", "fechaNacimiento", "nacionalidad", "genero", "estadoCivil"],
  2: ["userId", "password", "rolId", "profesorEspecialidad", "profesorMatricula", "profesorDescripcion"],
  3: ["domicilio", "domicilioPlaceId", "domicilioLat", "domicilioLng", "localidad", "provincia", "codigoPostal"],
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

export function UserForm({ mode, defaultValues, onSuccess, fixedRoleCode, backHref = "/users", title, description, headerIcon, submissionMode = "admin-create", submitLabel, successMessage }: Props) {
  const [step, setStep] = useState(1);
  const [viewMode, setViewMode] = useState<"workflow" | "full">("full");
  const [draftId, setDraftId] = useState<string>();
  const [savingDraft, setSavingDraft] = useState(false);
  const goToFieldStep = (field: keyof UserFormValues) => {
    const entry = Object.entries(STEP_FIELDS).find(([, fields]) => fields.includes(field));
    if (entry) setStep(Number(entry[0]));
  };
  const { form, onSubmit, submitting, roles, loadingRoles, identityTmpPath, avatarTmpPath, setIdentityTmpPath, setAvatarTmpPath } =
    useUserForm({ mode, defaultValues, onSuccess: (id) => { if (draftId) void deleteUserDraft(draftId); onSuccess?.(id); }, submissionMode, successMessage, onValidationError: goToFieldStep });
  const submitRequestedRef = useRef(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [stepStatus, setStepStatus] = useState<Record<number, StepStatus>>({ 1: "pending", 2: "pending", 3: "pending", 4: "pending", 5: "pending", 6: "pending", 7: "pending" });
  const creating = mode === "create";
  const workflow = viewMode === "workflow";
  const roleCode = fixedRoleCode ?? defaultValues?.rol?.codigo ?? defaultValues?.rol?.nombre ?? "";
  const draftScope: "citizen" | "personnel" = submissionMode === "reception-edit" || roleCode.toLowerCase().includes("citizen") || roleCode.toLowerCase().includes("ciudad") ? "citizen" : "personnel";
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
    let active = true;
    void getUserDraft<Record<string, unknown>>(draftScope, mode, defaultValues?.id).then((draft) => {
      if (!active || !draft) return;
      setDraftId(draft.id);
      setStep(draft.currentStep);
      setViewMode(draft.viewMode);
      setStepStatus(mode === "create" ? { ...draft.stepStatuses, 2: "unsaved" } : draft.stepStatuses);
      const { __identityTmpPath, __avatarTmpPath, ...payload } = draft.payload;
      form.reset({ ...form.getValues(), ...payload } as UserFormValues);
      if (typeof __identityTmpPath === "string") setIdentityTmpPath(__identityTmpPath);
      if (typeof __avatarTmpPath === "string") setAvatarTmpPath(__avatarTmpPath);
      toast.info(mode === "create" ? "Recuperamos el último borrador. Volvé a ingresar la contraseña." : "Recuperamos el último borrador guardado.");
    }).catch(() => undefined);
    return () => { active = false; };
  }, [defaultValues?.id, draftScope, form, mode, setAvatarTmpPath, setIdentityTmpPath]);
  useEffect(() => {
    const subscription = form.watch((_values, info) => {
      if (!info.name) return;
      const changedStep = Object.entries(STEP_FIELDS).find(([, fields]) => fields.includes(info.name as keyof UserFormValues));
      if (changedStep) setStepStatus((current) => ({ ...current, [Number(changedStep[0])]: "unsaved" }));
    });
    return () => subscription.unsubscribe();
  }, [form]);
  const steps = [
    ["Datos personales", UserRound], ["Credenciales", KeyRound], ["Domicilio", MapPin],
    ["Contacto", ShieldPlus], ["Cobertura", CheckCircle2], ["Imágenes", Images],
    ["Revisión", ClipboardCheck],
  ] as const;

  async function persistDraft(statuses: Record<number, StepStatus>, currentStep = step) {
    setSavingDraft(true);
    try {
      const payload: Record<string, unknown> = { ...(form.getValues() as unknown as Record<string, unknown>), __identityTmpPath: identityTmpPath, __avatarTmpPath: avatarTmpPath };
      delete payload.password;
      const draft = await saveUserDraft({ id: draftId, scope: draftScope, mode, subjectUserId: defaultValues?.id, payload, currentStep, stepStatuses: statuses, viewMode });
      setDraftId(draft.id);
      setStepStatus(draft.stepStatuses);
      toast.success("Borrador guardado.");
    } catch {
      toast.error("No pudimos guardar el borrador.");
      throw new Error("DRAFT_SAVE_FAILED");
    } finally { setSavingDraft(false); }
  }

  async function saveCurrentDraft() {
    const statuses = { ...stepStatus };
    if (workflow) {
      const valid = await form.trigger(STEP_FIELDS[step]);
      statuses[step] = valid ? "valid" : "invalid";
    } else {
      for (const [number, fields] of Object.entries(STEP_FIELDS)) statuses[Number(number)] = await form.trigger(fields) ? "valid" : "invalid";
    }
    await persistDraft(statuses);
  }

  async function discardDraft() {
    if (!draftId) return;
    await deleteUserDraft(draftId);
    window.location.reload();
  }

  async function continueToNextStep() {
    const valid = await form.trigger(STEP_FIELDS[step], { shouldFocus: true });
    const statuses = { ...stepStatus, [step]: valid ? "valid" as const : "invalid" as const };
    setStepStatus(statuses);
    if (!valid) {
      toast.error("Corregí los campos marcados antes de continuar.");
      return;
    }
    const nextStep = Math.min(7, step + 1);
    try { await persistDraft(statuses, nextStep); setStep(nextStep); } catch {}
  }

  const formActions = (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--brand-border)] pt-5 sm:flex-row sm:flex-wrap sm:justify-between">
      {workflow && step > 1 ? <Button type="button" variant="outline" className={`${adminSecondaryButtonClass} w-full justify-center gap-3 sm:w-auto`} onClick={()=>setStep((current)=>current-1)}><ArrowLeft className="h-5 w-5"/>Anterior</Button> : <Button asChild type="button" variant="outline" className={`${adminSecondaryButtonClass} w-full justify-center gap-3 sm:w-auto`}><Link href={backHref}><ArrowLeft className="h-5 w-5"/>Volver</Link></Button>}
      <div className="flex flex-col gap-3 sm:flex-row">
        {draftId ? <Button type="button" variant="ghost" disabled={savingDraft || submitting} onClick={() => void discardDraft()} className="h-12 gap-2 rounded-xl text-red-700 hover:bg-red-50"><Trash2 />Descartar borrador</Button> : null}
        <Button type="button" variant="outline" disabled={savingDraft || submitting || mediaUploading} onClick={() => void saveCurrentDraft()} className={`${adminSecondaryButtonClass} w-full justify-center gap-3 sm:w-auto`}>{savingDraft ? <Loader2 className="animate-spin" /> : <Save />}Guardar borrador</Button>
        {workflow && step < 7 ? <Button type="button" size="lg" disabled={savingDraft || submitting || mediaUploading || loadingRoles} onClick={continueToNextStep} className={`${adminPrimaryButtonClass} w-full justify-center gap-3 sm:w-auto`}>Guardar y continuar<ChevronRight className="h-5 w-5" /></Button> : <Button type="submit" size="lg" disabled={savingDraft || submitting || mediaUploading || loadingRoles} onClick={() => { submitRequestedRef.current = true; }} className={`${adminPrimaryButtonClass} w-full justify-center gap-3 sm:w-auto`}>{submitting || mediaUploading ? <Loader2 className="animate-spin" /> : null}{submitLabel ?? (mode === "create" ? "Crear usuario" : "Guardar cambios")}<Save /></Button>}
      </div>
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
    <AdminFormViewToggle value={viewMode} onChange={setViewMode} />
    <form
      id="user-form"
      className="w-full"
      onSubmit={(event) => { if ((workflow && step !== 7) || mediaUploading || !submitRequestedRef.current) { event.preventDefault(); return; } submitRequestedRef.current = false; void form.handleSubmit(async (values) => { setStepStatus({ 1: "valid", 2: "valid", 3: "valid", 4: "valid", 5: "valid", 6: "valid", 7: "valid" }); await onSubmit(values); }, onInvalid)(event); }}
      noValidate
    >
      <AdminWorkflowLayout sections={steps.filter((_, index) => workflow || index < 6).map(([label, icon], index) => ({ id: index + 1, label, icon, status: stepStatus[index + 1] }))} activeSection={step} onSectionChange={setStep} navigationLabel={creating ? "Pasos del alta" : "Pasos de edición"} fullWidth={!workflow}>
      <UserFormFields
        mode={mode}
        form={form}
        roles={roles}
        loadingRoles={loadingRoles}
        currentAvatarUrl={defaultValues?.fotoPerfilUrl || null}
        onTempAvatarUploaded={setIdentityTmpPath}
        onTempAvatarCleared={() => setIdentityTmpPath(null)}
        onTempPortalAvatarUploaded={setAvatarTmpPath}
        step={workflow ? step : undefined}
        footer={formActions}
        fixedRoleLabel={fixedRoleCode ? "Ciudadano" : undefined}
        hasPortalAvatar={Boolean(avatarTmpPath || defaultValues?.avatarUrl)}
        hasIdentityPhoto={Boolean(identityTmpPath || defaultValues?.fotoPerfilUrl)}
        onMediaUploadingChange={setMediaUploading}
        showReview={workflow}
      />
      </AdminWorkflowLayout>

    </form>
    </>
  );
}
