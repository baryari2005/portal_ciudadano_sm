import type { UserDTO } from "../types/auth.types";

export type WorkspaceKey = "administration" | "reception" | "teacher" | "citizen";
export const workspacePreferenceStorageKey = (userId: string) => `massm:${userId}:last-workspace`;
export const workspaceEstablishmentStorageKey = (userId: string, workspace: "reception" | "teacher") => `massm:${userId}:${workspace}:establishment`;

const ADMIN_MODULES = new Set(["usuarios", "roles", "actividades", "establecimientos", "profesores", "activity_schedules", "activity_sessions", "enrollments", "attendance", "requirements", "enrollment_documents", "audit_log", "reports", "notifications", "categorias_actividades", "publicos_objetivo", "general_settings"]);
const TEACHER_MINIMUM = ["activity_schedules:ver", "activity_sessions:ver", "enrollments:ver", "attendance:ver"];
const has = (user: UserDTO | null | undefined, key: string) => user?.permisos?.some((permission) => `${permission.modulo}:${permission.accion}` === key) ?? false;
const roleCode = (user: UserDTO | null | undefined) => (user?.rol?.codigo || user?.rol?.nombre || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const isAdministratorRole = (user: UserDTO | null | undefined) => ["admin", "administrador"].includes(roleCode(user));
const isReceptionRole = (user: UserDTO | null | undefined) => ["reception", "recepcion"].includes(roleCode(user));
const isTeacherRole = (user: UserDTO | null | undefined) => ["teacher", "profesor"].includes(roleCode(user));
const isCitizenRole = (user: UserDTO | null | undefined) => ["citizen", "ciudadano", "user", "usuario"].includes(roleCode(user));
const hasDedicatedPortalRole = (user: UserDTO | null | undefined) => ["reception", "recepcion", "teacher", "profesor", "citizen", "ciudadano", "user"].includes(roleCode(user));

export const hasAdministrativeWorkspace = (user: UserDTO | null | undefined) => isAdministratorRole(user) || (!hasDedicatedPortalRole(user) && (user?.permisos?.some((permission) => ADMIN_MODULES.has(permission.modulo)) ?? false));
export const hasReceptionWorkspace = (user: UserDTO | null | undefined) => isReceptionRole(user) && has(user, "access:ver");
/** @deprecated El módulo de permiso continúa llamándose `access`; el workspace es `reception`. */
export const hasAccessWorkspace = hasReceptionWorkspace;
export const hasTeacherPermissions = (user: UserDTO | null | undefined) => isTeacherRole(user) && TEACHER_MINIMUM.every((key) => has(user, key));
export const hasCitizenWorkspace = (user: UserDTO | null | undefined) => isCitizenRole(user);
export function availableWorkspaces(user: UserDTO, teacherProfileEnabled: boolean): WorkspaceKey[] { return [...(hasAdministrativeWorkspace(user) ? ["administration" as const] : []), ...(hasReceptionWorkspace(user) ? ["reception" as const] : []), ...(teacherProfileEnabled && hasTeacherPermissions(user) ? ["teacher" as const] : []), ...(hasCitizenWorkspace(user) ? ["citizen" as const] : [])]; }
export const workspaceRoute = (workspace: WorkspaceKey) => workspace === "administration" ? "/" : workspace === "reception" ? "/reception" : workspace === "teacher" ? "/teacher" : "/citizen";
export const workspaceForPath = (path: string): WorkspaceKey => path.startsWith("/reception") || path.startsWith("/access") || path === "/validar-qr" || path === "/busqueda-manual" ? "reception" : path.startsWith("/teacher") ? "teacher" : path.startsWith("/citizen") ? "citizen" : "administration";
export function getDefaultWorkspace(user: UserDTO, teacherProfileEnabled: boolean, preferred?: string | null) { const available = availableWorkspaces(user, teacherProfileEnabled); const normalizedPreferred = preferred === "access" ? "reception" : preferred; return workspaceRoute(available.find((workspace) => workspace === normalizedPreferred) ?? available[0] ?? "citizen"); }
