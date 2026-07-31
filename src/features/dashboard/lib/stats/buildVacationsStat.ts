import type { Stat } from "@/features/dashboard/types/types";
import type { VacationsStatParams } from "../../types/dashboardBuilders";

export function buildVacationsStat({
  canApprove,
  canLoad,
  loadingBalance,
  availableDays,
  loadingVacationLeaves,
  pendingVacationLeaves,
  onGoVacations,
}: VacationsStatParams): Stat {
  return {
    id: "vacations",
    labelTop: "Vacaciones",
    disabled: !canLoad && !canApprove,
    disabledHint:
      !canLoad && !canApprove
        ? "No tenés permisos para ver esta sección.\n Si creés que esto es un error, pedile acceso a un administrador."
        : "",
    labelBottom: canLoad
      ? "Días disponibles"
      : loadingVacationLeaves
        ? "Cargando…"
        : pendingVacationLeaves > 0
          ? "Vacaciones pendientes de aprobación"
          : "Sin pendientes",
    value: canLoad
      ? loadingBalance
        ? "—"
        : availableDays
      : pendingVacationLeaves,
    iconName: "Sunrise",
    highlight: canApprove && pendingVacationLeaves > 0,
    onClick: onGoVacations,
  };
}
