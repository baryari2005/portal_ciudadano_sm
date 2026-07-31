"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCan } from "@/hooks/useCan";
import AccessDenied403Page from "../../403/page";
import { UserForm } from "@/features/users/components/UserForm";
import { UserFormValues } from "@/features/users/types/types";
import Loading from "../../loading";
import { UserCog } from "lucide-react";

type EditUserInitialValues = Partial<UserFormValues> & {
  id?: string;
  rol?: { id: number; codigo?: string; nombre?: string };
};

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const canEdit = useCan("usuarios", "editar");

  if (!canEdit) {
    return <AccessDenied403Page />;
  }

  return <EditUserContent id={id} />;
}

function EditUserContent({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState<EditUserInitialValues | null>(null);
  const [fixedRoleCode, setFixedRoleCode] = useState<string>();

  useEffect(() => {
    (async () => {
      setLoading(true);

      const t = localStorage.getItem("token");
      const res = await fetch(`/api/users/${id}`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
        cache: "no-store",
      });

      const data = await res.json();

      const roleCode = data.rol?.codigo?.toLowerCase();
      const roleName = data.rol?.nombre?.toLowerCase();
      const isCitizen = ["user", "usuario", "citizen", "ciudadano"].includes(roleCode ?? "") || ["user", "usuario", "citizen", "ciudadano"].includes(roleName ?? "");
      setFixedRoleCode(isCitizen ? (roleCode || "user") : undefined);

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
        coberturaMedicaId: data.coberturaMedicaId ?? data.coberturaMedica?.id ?? null,
        numeroAfiliado: data.numeroAfiliado ?? "",
        fechaNacimiento: data.fechaNacimiento ?? null,
        genero: data.genero ?? undefined,
        estadoCivil: data.estadoCivil ?? undefined,
        nacionalidad: data.nacionalidad ?? undefined,
      });

      setLoading(false);
    })();
  }, [id]);

  if (loading || !initial) {
    return <Loading />;
  }

  return (
    <div className="min-h-[calc(100dvh-var(--topbar-h)-48px)] w-full overflow-y-auto bg-[#F7FBF5] p-4 sm:p-6 lg:h-[calc(100dvh-var(--topbar-h)-48px)] lg:p-8">
      <div className="pr-2">
        <UserForm
          mode="edit"
          defaultValues={initial}
          fixedRoleCode={fixedRoleCode}
          title="Editar usuario"
          description="Actualizá y validá cada sección antes de guardar los cambios."
          headerIcon={UserCog}
          onSuccess={(uid) => router.replace(`/users/${uid}`)}
        />
      </div>
    </div>
  );
}
