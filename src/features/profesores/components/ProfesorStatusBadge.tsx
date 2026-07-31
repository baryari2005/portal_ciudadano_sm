import { Badge } from "@/components/ui/badge";
import { CatalogStatusBadge } from "@/features/activity-catalogs/components/CatalogPrimitives";
import type { ProfesorEstado } from "../types/profesor.types";
const labels: Record<ProfesorEstado, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  SUSPENDIDO: "Suspendido",
};
export function ProfesorStatusBadge({ estado }: { estado: ProfesorEstado }) {
  if (estado !== "SUSPENDIDO") {
    return (
      <CatalogStatusBadge
        active={estado === "ACTIVO"}
        activeLabel="Activo"
        inactiveLabel="Inactivo"
      />
    );
  }

  return (
    <Badge variant="outline" className="rounded-full border-amber-300 bg-amber-50 px-2.5 py-0.5 font-bold text-amber-800">
      {labels[estado]}
    </Badge>
  );
}
