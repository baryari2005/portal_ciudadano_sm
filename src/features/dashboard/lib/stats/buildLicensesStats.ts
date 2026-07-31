import type { Stat } from "@/features/dashboard/types/types";
import type { LicensesStatParams } from "../../types/dashboardBuilders";

export function buildLicensesStat({
  canApprove,
  canLoad,
  loadingOtherLeaves,
  pendingOtherLeaves,
  onGoLicenses,
}: LicensesStatParams): Stat {
  const canAccess = canApprove || canLoad;

  return {
    id: "licenses",
    labelTop: "Licencias",
    disabled: !canAccess,
    disabledHint: !canAccess
      ? "No tenés permisos para ver esta sección.\n Si creés que esto es un error, pedile acceso a un administrador."
      : "",
    labelBottom: loadingOtherLeaves
      ? "Cargando…"
      : pendingOtherLeaves > 0
        ? canApprove
          ? "Licencias pendientes de aprobación"
          : "Pendientes de aprobación"
        : "Sin pendientes",
    value: pendingOtherLeaves,
    iconName: "ClipboardList",
    highlight: canApprove && pendingOtherLeaves > 0,
    onClick: onGoLicenses,
  };
}
