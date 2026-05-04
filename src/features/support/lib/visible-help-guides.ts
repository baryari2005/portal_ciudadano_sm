import { hasPermission } from "@/features/auth/libs/permissions";
import type { PermissionDTO } from "@/features/auth/types/auth.types";
import {
  HELP_GUIDES,
  type HelpGuide,
  type HelpPermission,
} from "./help-guides";

function canAccessByPermission(
  permissions: PermissionDTO[],
  permission?: HelpPermission | HelpPermission[]
) {
  if (!permission) return true;

  if (Array.isArray(permission)) {
    return permission.some((item) =>
      hasPermission(permissions, item.modulo, item.accion)
    );
  }

  return hasPermission(permissions, permission.modulo, permission.accion);
}

export function getVisibleHelpGuides(permissions: PermissionDTO[]) {
  return HELP_GUIDES.filter((guide) =>
    canAccessByPermission(permissions, guide.permission)
  );
}

export function formatGuidesForAssistant(guides: HelpGuide[]) {
  return guides
    .map((guide) => {
      const steps = guide.steps.map((step) => `- ${step}`).join("\n");

      return [
        `ID: ${guide.id}`,
        `Categoria: ${guide.category}`,
        `Titulo: ${guide.title}`,
        `Descripcion: ${guide.description}`,
        `Ruta: ${guide.href ?? "Sin ruta"}`,
        `CTA: ${guide.ctaLabel ?? "Sin CTA"}`,
        "Pasos:",
        steps,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}
