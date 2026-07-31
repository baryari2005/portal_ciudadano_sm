import type { Stat } from "@/features/dashboard/types/types";
import type { DocumentsStatParams } from "../../types/dashboardBuilders";

export function buildDocumentsStat({
  canView,
  loadingDocs,
  pendingDocs,
  onGoReceipts,
}: DocumentsStatParams): Stat {
  return {
    id: "documents",
    labelTop: "Documentos",
    labelBottom: loadingDocs
      ? "Comprobando…"
      : pendingDocs > 0
        ? "Pendientes por firmar"
        : "Sin pendientes",
    value: pendingDocs,
    iconName: "FileSignature",
    disabled: !canView,
    disabledHint: !canView
      ? "No tenés permisos para ver esta sección.\n Si creés que esto es un error, pedile acceso a un administrador."
      : "",
    onClick: onGoReceipts,
  };
}
