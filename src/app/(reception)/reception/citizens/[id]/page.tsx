"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { UserCog } from "lucide-react";
import { UserForm } from "@/features/users/components/UserForm";
import { getReceptionCitizen } from "@/features/users/services/api.service";
import type { UserFormValues } from "@/features/users/types/types";

type InitialValues = Partial<UserFormValues> & {
  id: string;
  rol?: { id: number; codigo?: string; nombre?: string };
};

export default function ReceptionCitizenEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [initial, setInitial] = useState<InitialValues | null>(null);

  useEffect(() => {
    let active = true;
    getReceptionCitizen(id).then((data) => {
      if (!active) return;
      setInitial({
        id,
        userId: data.userId,
        email: data.email,
        nombre: data.nombre ?? "",
        apellido: data.apellido ?? "",
        avatarUrl: data.avatarUrl ?? "",
        fotoPerfilUrl: data.fotoPerfilUrl ?? "",
        rol: data.rol?.id ? { id: data.rol.id, codigo: data.rol.codigo, nombre: data.rol.nombre } : undefined,
        tipoDocumento: data.tipoDocumento ?? undefined,
        documento: data.documento ?? "",
        cuil: data.cuil ?? "",
        celular: data.celular ?? "",
        domicilio: data.domicilio ?? "",
        localidad: data.localidad ?? "",
        provincia: data.provincia ?? "",
        codigoPostal: data.codigoPostal ?? "",
        contactoEmergenciaNombre: data.contactoEmergenciaNombre ?? "",
        contactoEmergenciaTelefono: data.contactoEmergenciaTelefono ?? "",
        coberturaMedicaId: data.coberturaMedicaId ?? null,
        numeroAfiliado: data.numeroAfiliado ?? "",
        fechaNacimiento: data.fechaNacimiento ?? null,
        genero: data.genero ?? undefined,
        estadoCivil: data.estadoCivil ?? undefined,
        nacionalidad: data.nacionalidad ?? undefined,
      });
    });
    return () => { active = false; };
  }, [id]);

  if (!initial) return <div className="min-h-[60vh] animate-pulse rounded-3xl bg-white/70" />;

  return <div className="min-h-[calc(100dvh-var(--topbar-h)-48px)] w-full overflow-y-auto bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8">
    <UserForm
      mode="edit"
      defaultValues={initial}
      fixedRoleCode="citizen"
      submissionMode="reception-edit"
      backHref="/reception/citizens"
      title="Editar ciudadano"
      description="Actualizá los datos personales autorizados del ciudadano."
      headerIcon={UserCog}
      successMessage="Los datos del ciudadano fueron actualizados correctamente."
      onSuccess={() => router.replace(`/reception/citizens?selected=${id}`)}
    />
  </div>;
}
