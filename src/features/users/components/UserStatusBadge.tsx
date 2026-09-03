import { Badge } from "@/components/ui/badge";
import { CatalogStatusBadge } from "@/features/activity-catalogs/components/CatalogPrimitives";

type UserStatus = "PENDIENTE" | "ACTIVO" | "RECHAZADO" | "BLOQUEADO";

const STATUS_LABELS: Record<UserStatus, string> = {
  PENDIENTE: "Pendiente",
  ACTIVO: "Activo",
  RECHAZADO: "Rechazado",
  BLOQUEADO: "Bloqueado",
};

const STATUS_CLASSES: Record<UserStatus, string> = {
  PENDIENTE: "border-[#819B56]/40 bg-[#819B56]/10 text-[#1D4F36]",
  ACTIVO: "border-emerald-600/30 bg-emerald-50 text-emerald-700",
  RECHAZADO: "border-red-600/30 bg-red-50 text-red-700",
  BLOQUEADO: "border-zinc-500/30 bg-zinc-100 text-zinc-700",
};

export function UserStatusBadge({ status }: { status?: UserStatus }) {
  const normalized = status ?? "ACTIVO";

  if (normalized === "ACTIVO") {
    return <CatalogStatusBadge active activeLabel="Activo" />;
  }

  return (
    <Badge variant="outline" className={STATUS_CLASSES[normalized]}>
      {STATUS_LABELS[normalized]}
    </Badge>
  );
}
