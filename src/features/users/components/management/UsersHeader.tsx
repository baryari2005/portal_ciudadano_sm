import { useRouter } from "next/navigation";
import { UsersRound } from "lucide-react";

import { CatalogPageHeader } from "@/features/activity-catalogs/components/CatalogPrimitives";

export function UsersHeader({ total, canCreate, scope = "citizen", context = "admin" }: { total: number; canCreate: boolean; scope?: "citizen" | "personnel"; context?: "admin" | "reception" }) {
  const router = useRouter();

  return (
    <CatalogPageHeader
      icon={UsersRound}
      title={scope === "personnel" ? "Personal" : "Ciudadanos"}
      description={scope === "personnel" ? "Gestioná empleados, profesores, recepcionistas y administradores." : "Gestioná ciudadanos, estados y solicitudes de acceso."}
      total={total}
      createLabel={scope === "personnel" ? "Nuevo integrante" : "Nuevo ciudadano"}
      canCreate={canCreate}
      onCreate={() => router.push(context === "reception" ? "/reception/request-access" : scope === "personnel" ? "/personnel/new" : "/users/new")}
    />
  );
}
