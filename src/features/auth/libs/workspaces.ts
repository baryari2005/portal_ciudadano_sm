import type { UserDTO } from "../types/auth.types";
export type WorkspaceKey = "administration" | "access" | "teacher" | "citizen";
export const WORKSPACE_STORAGE_KEY = "massm:last-workspace";
const ADMIN_MODULES = new Set(["usuarios", "roles", "actividades", "establecimientos", "profesores", "activity_schedules", "activity_sessions", "enrollments", "attendance", "requirements", "enrollment_documents", "audit_log", "reports", "notifications", "categorias_actividades", "publicos_objetivo"]);
const TEACHER_MINIMUM = ["activity_schedules:ver", "activity_sessions:ver", "enrollments:ver", "attendance:ver"];
const has = (user: UserDTO | null | undefined, key: string) => user?.permisos?.some((permission) => `${permission.modulo}:${permission.accion}` === key) ?? false;
const isAdministratorRole = (user: UserDTO | null | undefined) => {
  const role = (user?.rol?.codigo || user?.rol?.nombre || "").trim().toLowerCase();
  return role === "admin" || role === "administrador";
};
export const hasAdministrativeWorkspace = (user: UserDTO | null | undefined) => isAdministratorRole(user) || (user?.permisos?.some((permission) => ADMIN_MODULES.has(permission.modulo)) ?? false);
export const hasAccessWorkspace = (user: UserDTO | null | undefined) => has(user, "access:ver");
export const hasTeacherPermissions = (user: UserDTO | null | undefined) => TEACHER_MINIMUM.every((key) => has(user, key));
export function availableWorkspaces(user: UserDTO, teacherProfileEnabled: boolean): WorkspaceKey[] { return [...(hasAdministrativeWorkspace(user) ? ["administration" as const] : []), ...(hasAccessWorkspace(user) ? ["access" as const] : []), ...(teacherProfileEnabled && hasTeacherPermissions(user) ? ["teacher" as const] : []), "citizen"]; }
export const workspaceRoute = (workspace: WorkspaceKey) => workspace === "administration" ? "/" : workspace === "access" ? "/access" : workspace === "teacher" ? "/teacher" : "/citizen";
export const workspaceForPath = (path: string): WorkspaceKey => path.startsWith("/access") || path === "/validar-qr" || path === "/busqueda-manual" ? "access" : path.startsWith("/teacher") ? "teacher" : path.startsWith("/citizen") ? "citizen" : "administration";
export function getDefaultWorkspace(user: UserDTO, teacherProfileEnabled: boolean, preferred?: string | null) { const available = availableWorkspaces(user, teacherProfileEnabled); if (isAdministratorRole(user)) return workspaceRoute("administration"); return workspaceRoute(available.find((workspace) => workspace === preferred) ?? available[0] ?? "citizen"); }
