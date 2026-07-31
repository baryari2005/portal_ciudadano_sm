"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  requestAccessSchema,
  type RequestAccessFormValues,
} from "../schemas/requestAccessSchema";
import { submitRequestAccess } from "../services/requestAccessService";

const defaultValues: RequestAccessFormValues = {
  nombre: "",
  apellido: "",
  genero: "PREFIERE_NO_DECIR",
  nacionalidad: "ARGENTINA",
  dni: "",
  direccion: "",
  localidad: "",
  provincia: "",
  codigoPostal: "",
  direccionPlaceId: "",
  direccionLat: null,
  direccionLng: null,
  email: "",
  telefono: "",
  contactoEmergenciaNombre: "",
  contactoEmergenciaTelefono: "",
  coberturaMedicaId: null,
  numeroAfiliado: "",
  fechaNacimiento: "",
  userId: "",
  password: "",
  profilePhotoTmpPath: "",
  avatarTmpPath: "",
};

export function useRequestAccessForm() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<RequestAccessFormValues>({
    resolver: zodResolver(requestAccessSchema),
    defaultValues,
    mode: "onBlur",
  });

  const onSubmit = async (values: RequestAccessFormValues) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = requestAccessSchema.parse(values);
      const response = await submitRequestAccess(payload);

      setSuccessMessage(
        `${response.message}. Un administrador deberá aprobar tu acceso.`,
      );
      form.reset(defaultValues);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No pudimos enviar la solicitud. Intentá nuevamente.",
      );
    }
  };

  return {
    form,
    onSubmit,
    successMessage,
    errorMessage,
  };
}
