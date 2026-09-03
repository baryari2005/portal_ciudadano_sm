import { hasPermission } from "@/features/auth/libs/permissions";
import type { PermissionDTO } from "@/features/auth/types/auth.types";
import {
  HELP_CATEGORY_META,
  HELP_GUIDES,
  type HelpGuide,
  type HelpPermission,
  type HelpCategory,
} from "./help-guides";

export function hasHelpPermission(permissions: PermissionDTO[], permission: HelpPermission) {
  return hasPermission(permissions, permission.modulo, permission.accion);
}

export function canAccessHelpGuide(permissions: PermissionDTO[], guide: HelpGuide) {
  const required = guide.requiredPermissions ?? [];
  if (required.length === 0) return true;
  const checks = required.map((item) => hasHelpPermission(permissions, item));
  return guide.permissionMode === "any" ? checks.some(Boolean) : checks.every(Boolean);
}

export function getVisibleHelpGuides(permissions: PermissionDTO[], category?: HelpCategory) {
  return HELP_GUIDES.filter((guide) =>
    (!category || guide.category === category) && canAccessHelpGuide(permissions, guide),
  ).sort(
    (a, b) =>
      HELP_CATEGORY_META[a.category].order -
        HELP_CATEGORY_META[b.category].order || a.order - b.order,
  );
}

export function getVisibleHelpLinks(permissions: PermissionDTO[], guide: HelpGuide) {
  return (guide.links ?? []).filter((link) => !link.permission || hasHelpPermission(permissions, link.permission));
}

export function formatGuidesForAssistant(guides: HelpGuide[]) {
  return guides.map((guide) => [
    `ID: ${guide.id}`,
    `Categoria: ${guide.category}`,
    `Titulo: ${guide.title}`,
    `Descripcion: ${guide.description}`,
    `Rutas: ${(guide.links ?? []).map((link) => `${link.label} (${link.href})`).join(", ") || "Sin ruta"}`,
    "Pasos:",
    ...guide.steps.map((step) => `- ${step}`),
    ...(guide.warnings?.length ? ["Advertencias:", ...guide.warnings.map((warning) => `- ${warning}`)] : []),
  ].join("\n")).join("\n\n---\n\n");
}
