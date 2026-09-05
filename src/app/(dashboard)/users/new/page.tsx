"use client";

import { useRouter } from "next/navigation";

import AccessDenied403Page from "../../403/page";
import { UserForm } from "@/features/users/components/UserForm";
import { useCan } from "@/hooks/useCan";

export default function NewUserPage() {
  const router = useRouter();
  const canInsert = useCan("usuarios", "crear");
  if (!canInsert) return <AccessDenied403Page />;

  return (
    <div className="min-h-[calc(100dvh-var(--topbar-h)-48px)] w-full overflow-y-auto bg-[var(--brand-page)] p-4 sm:p-6 lg:h-[calc(100dvh-var(--topbar-h)-48px)] lg:p-8">
      <UserForm
        mode="create"
        fixedRoleCode="citizen"
        title="Alta de ciudadano"
        description="Cargá los datos personales, las imágenes y las credenciales de acceso."
        onSuccess={() => router.replace("/users")}
      />
    </div>
  );
}
