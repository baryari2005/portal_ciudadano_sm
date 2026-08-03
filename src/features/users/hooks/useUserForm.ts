"use client";

import { useEffect, useMemo } from "react";
import { Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AxiosError } from "axios";
import { toast } from "sonner";

import {
  createUserSchema,
  editUserSchema,
} from "@/features/users/schemas/schemas";
import { normalize, pathFromPublicUrl } from "@/features/users/lib/utils";
import { useRoles } from "@/features/users/hooks/useRoles";
import { useAvatarStaging } from "@/features/users/hooks/useAvatarStaging";
import { createReceptionAccessRequest, createUser, updateReceptionCitizen, updateUser } from "@/features/users/services/api.service";
import { toYmdLocal } from "@/features/users/lib/user-form.helpers";
import { toReceptionRequestPayload } from "@/features/reception/lib/reception-request.mapper";
import { UserFormValues } from "../types/types";

type Mode = "create" | "edit";
export type UserSubmissionMode = "admin-create" | "reception-request" | "reception-edit";

function isDateValue(v: unknown): v is Date {
  return v instanceof Date && !Number.isNaN(v.getTime());
}

function toNullableString(v?: string | null): string | null {
  const trimmed = v?.trim();
  return trimmed ? trimmed : null;
}

type UserPayload = {
  userId: string;
  email: string;
  password?: string;
  nombre: string;
  apellido: string;
  rolId: number;
  fechaNacimiento: string | null;
  genero: UserFormValues["genero"] | null;
  estadoCivil: UserFormValues["estadoCivil"] | null;
  nacionalidad: UserFormValues["nacionalidad"] | null;
  tipoDocumento: UserFormValues["tipoDocumento"] | null;
  documento: string | null;
  cuil: string | null;
  celular: string | null;
  domicilio: string | null;
  localidad: string | null;
  provincia: string | null;
  domicilioPlaceId: string | null;
  domicilioLat: number | null;
  domicilioLng: number | null;
  codigoPostal: string | null;
  contactoEmergenciaNombre: string | null;
  contactoEmergenciaTelefono: string | null;
  coberturaMedicaId: string | null;
  numeroAfiliado: string | null;
  professorProfile?: { especialidad: string | null; matricula: string | null; descripcion: string | null };
};

export function useUserForm({
  mode,
  defaultValues,
  onSuccess,
  submissionMode = "admin-create",
  onValidationError,
  successMessage,
}: {
  mode: Mode;
  defaultValues?: Partial<UserFormValues> & {
    id?: string;
    rol?: { id: number };
    fechaNacimiento?: string | Date | null;
  };
  onSuccess?: (id: string) => void;
  submissionMode?: UserSubmissionMode;
  onValidationError?: (field: keyof UserFormValues) => void;
  successMessage?: string;
}) {
  const schema = mode === "create" ? createUserSchema : editUserSchema;

  const derivedDefaults = useMemo<UserFormValues>(() => {
    const rawFN = defaultValues?.fechaNacimiento;

    let fechaNacimiento: string | null = null;

    if (typeof rawFN === "string") {
      fechaNacimiento = rawFN;
    } else if (isDateValue(rawFN)) {
      fechaNacimiento = toYmdLocal(rawFN);
    }

    return {
      userId: defaultValues?.userId ?? "",
      email: defaultValues?.email ?? "",
      password: "",
      nombre: defaultValues?.nombre ?? "",
      apellido: defaultValues?.apellido ?? "",
      avatarUrl: defaultValues?.avatarUrl ?? "",
      fotoPerfilUrl: defaultValues?.fotoPerfilUrl ?? "",
      rolId: defaultValues?.rolId ?? defaultValues?.rol?.id ?? (submissionMode === "reception-request" ? 1 : 0),
      tipoDocumento:
        (defaultValues?.tipoDocumento as UserFormValues["tipoDocumento"]) ??
        (mode === "create" ? "DNI" : undefined),
      documento: defaultValues?.documento ?? "",
      cuil: submissionMode === "reception-edit" ? "" : defaultValues?.cuil ?? "",
      celular: defaultValues?.celular ?? "",
      domicilio: defaultValues?.domicilio ?? "",
      localidad: defaultValues?.localidad ?? "",
      provincia: defaultValues?.provincia ?? "",
      domicilioPlaceId: defaultValues?.domicilioPlaceId ?? null,
      domicilioLat: defaultValues?.domicilioLat ?? null,
      domicilioLng: defaultValues?.domicilioLng ?? null,
      codigoPostal: defaultValues?.codigoPostal ?? "",
      contactoEmergenciaNombre: defaultValues?.contactoEmergenciaNombre ?? "",
      contactoEmergenciaTelefono: defaultValues?.contactoEmergenciaTelefono ?? "",
      coberturaMedicaId: defaultValues?.coberturaMedicaId ?? null,
      numeroAfiliado: defaultValues?.numeroAfiliado ?? "",
      fechaNacimiento,
      genero: (defaultValues?.genero as UserFormValues["genero"]) ?? undefined,
      estadoCivil:
        (defaultValues?.estadoCivil as UserFormValues["estadoCivil"]) ??
        undefined,
      nacionalidad:
        (defaultValues?.nacionalidad as UserFormValues["nacionalidad"]) ??
        undefined,
      profesorEspecialidad: defaultValues?.profesorEspecialidad ?? "",
      profesorMatricula: defaultValues?.profesorMatricula ?? "",
      profesorDescripcion: defaultValues?.profesorDescripcion ?? "",
    };
  }, [defaultValues, mode, submissionMode]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema) as Resolver<UserFormValues>,
    defaultValues: derivedDefaults,
    mode: "onChange",
  });

  useEffect(() => {
    form.reset(derivedDefaults);
  }, [derivedDefaults, form]);

  const submitting = form.formState.isSubmitting;
  const { roles, loading: loadingRoles } = useRoles(submissionMode === "admin-create");
  const identityPhoto = useAvatarStaging();
  const avatar = useAvatarStaging();

  const oldProfilePhotoPath = pathFromPublicUrl(
    defaultValues?.fotoPerfilUrl || undefined,
  );

  const onSubmit = async (values: UserFormValues) => {
    try {
      const payload: UserPayload = {
        userId: values.userId.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        nombre: normalize(values.nombre),
        apellido: normalize(values.apellido),
        rolId: Number(values.rolId),
        fechaNacimiento: values.fechaNacimiento ?? null,
        genero: values.genero ?? null,
        estadoCivil: values.estadoCivil ?? null,
        nacionalidad: values.nacionalidad ?? null,
        tipoDocumento: values.tipoDocumento ?? null,
        documento: toNullableString(values.documento),
        cuil: toNullableString(values.cuil),
        celular: toNullableString(values.celular),
        domicilio: toNullableString(values.domicilio),
        localidad: toNullableString(values.localidad),
        provincia: toNullableString(values.provincia),
        domicilioPlaceId: values.domicilioPlaceId ?? null,
        domicilioLat: values.domicilioLat ?? null,
        domicilioLng: values.domicilioLng ?? null,
        codigoPostal: toNullableString(values.codigoPostal),
        contactoEmergenciaNombre: toNullableString(values.contactoEmergenciaNombre),
        contactoEmergenciaTelefono: toNullableString(values.contactoEmergenciaTelefono),
        coberturaMedicaId: values.coberturaMedicaId??null,
        numeroAfiliado: toNullableString(values.numeroAfiliado),
      };

      const selectedRole = roles.find((role) => role.id === Number(values.rolId));
      const selectedRoleCode = selectedRole?.codigo?.trim().toLowerCase();
      const selectedRoleName = selectedRole?.nombre.trim().toLowerCase();
      if (["teacher", "profesor"].includes(selectedRoleCode ?? "") || selectedRoleName === "profesor") {
        payload.professorProfile = {
          especialidad: toNullableString(values.profesorEspecialidad),
          matricula: toNullableString(values.profesorMatricula),
          descripcion: toNullableString(values.profesorDescripcion),
        };
      }

      if (mode === "edit" && !payload.password?.trim()) {
        delete payload.password;
      }

      if (mode === "create") {
        const created = submissionMode === "reception-request"
          ? await createReceptionAccessRequest(toReceptionRequestPayload(values))
          : await createUser(payload);
        const updateCreated = submissionMode === "reception-request" ? updateReceptionCitizen : updateUser;

        if (identityPhoto.tmpPath) {
          try {
            const r = await identityPhoto.commit(`identity-photos/${created.id}`);
            await updateCreated(created.id, { fotoPerfilUrl: r.publicUrl });
          } catch {}
        }
        if (avatar.tmpPath) {
          try {
            const r = await avatar.commit(`users/${created.id}`);
            await updateCreated(created.id, { avatarUrl: r.publicUrl });
          } catch {}
        }

        toast.success(submissionMode === "reception-request" ? "Solicitud enviada" : "Usuario creado correctamente");
        onSuccess?.(created.id);
        return;
      }

      const id = defaultValues?.id;

      if (!id) {
        throw new Error("Falta el id del usuario para actualizar");
      }

      const updatePayload: Partial<UserPayload> = { ...payload };
      if (submissionMode === "reception-edit") {
        delete updatePayload.userId;
        delete updatePayload.rolId;
        delete updatePayload.tipoDocumento;
        delete updatePayload.cuil;
      }
      const update = submissionMode === "reception-edit" ? updateReceptionCitizen : updateUser;
      await update(id, updatePayload);

      if (identityPhoto.tmpPath) {
        try {
          const r = await identityPhoto.commit(`identity-photos/${id}`, oldProfilePhotoPath);
          await update(id, { fotoPerfilUrl: r.publicUrl });
        } catch {}
      }
      if (avatar.tmpPath) {
        try {
          const r = await avatar.commit(`users/${id}`);
          await update(id, { avatarUrl: r.publicUrl });
        } catch {}
      }

      toast.success(successMessage ?? "Usuario actualizado correctamente");
      onSuccess?.(id);
    } catch (err: unknown) {
      const ax = err as AxiosError<{ message?: string | string[]; issues?: Array<{ path: string; message: string }> }>;
      const status = ax.response?.status;
      const rawMsg = ax.response?.data?.message;
      const serverMsg = Array.isArray(rawMsg)
        ? rawMsg.join(", ")
        : rawMsg || (err instanceof Error ? err.message : "Error al guardar");

      toast.error(serverMsg);

      if (status === 400 && ax.response?.data?.issues?.length) {
        const validFields = new Set<keyof UserFormValues>(["userId", "email", "password", "rolId", "nombre", "apellido", "avatarUrl", "fotoPerfilUrl", "tipoDocumento", "documento", "cuil", "celular", "domicilio", "localidad", "provincia", "domicilioPlaceId", "domicilioLat", "domicilioLng", "codigoPostal", "contactoEmergenciaNombre", "contactoEmergenciaTelefono", "coberturaMedicaId", "numeroAfiliado", "fechaNacimiento", "genero", "estadoCivil", "nacionalidad"]);
        let firstField: keyof UserFormValues | undefined;
        for (const issue of ax.response.data.issues) {
          const field = issue.path.split(".")[0] as keyof UserFormValues;
          if (!validFields.has(field)) continue;
          firstField ??= field;
          form.setError(field, { type: "server", message: issue.message });
        }
        if (firstField) onValidationError?.(firstField);
        return;
      }

      if (status === 409) {
        if (/email/i.test(serverMsg)) {
          form.setError("email", {
            type: "server",
            message: "El email ya está registrado.",
          });
        }

        if (/userId/i.test(serverMsg)) {
          form.setError("userId", {
            type: "server",
            message: "El usuario (userId) ya existe.",
          });
        }

        if (/documento/i.test(serverMsg)) {
          form.setError("documento", {
            type: "server",
            message: "El documento ya está registrado.",
          });
        }

        if (/CUIL|cuil/i.test(serverMsg)) {
          form.setError("cuil", {
            type: "server",
            message: "El CUIL ya está registrado.",
          });
        }
      }

      if (status !== undefined && status < 500) return;
      throw err;
    }
  };

  return {
    form,
    onSubmit,
    submitting,
    roles,
    loadingRoles,
    identityTmpPath: identityPhoto.tmpPath,
    avatarTmpPath: avatar.tmpPath,
    setIdentityTmpPath: identityPhoto.setTmpPath,
    setAvatarTmpPath: avatar.setTmpPath,
  };
}
