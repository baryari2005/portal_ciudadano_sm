import { axiosInstance } from "@/lib/axios";

import {
  buildUserInitials,
  formatDateTime,
} from "../helpers/user-management.helpers";
import type {
  ManagedUser,
  ManagedRole,
  ManagedUserStatus,
  UserManagementListResponse,
  UserManagementMeta,
} from "../types/management.types";

export type ApiUser = {
  id: string;
  userId: string;
  email: string;
  nombre?: string | null;
  apellido?: string | null;
  estado?: ManagedUserStatus;
  perfilCompleto?: boolean;
  avatarUrl?: string | null;
  rol?: { id: number; nombre: string; descripcion?: string | null } | null;
  createdAt?: string | Date | null;
  documento?: string | null;
  celular?: string | null;
  domicilio?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  codigoPostal?: string | null;
  tipoDocumento?: string | null;
  cuil?: string | null;
  genero?: string | null;
  estadoCivil?: string | null;
  nacionalidad?: string | null;
  fotoPerfilUrl?: string | null;
  domicilioLat?: number | null;
  domicilioLng?: number | null;
  contactoEmergenciaNombre?: string | null;
  contactoEmergenciaTelefono?: string | null;
  coberturaMedica?: { id: string; nombre: string } | null;
  numeroAfiliado?: string | null;
  profesor?: { especialidad?: string | null; matricula?: string | null; descripcion?: string | null } | null;
  fechaNacimiento?: string | Date | null;
  estadoParticipacion?: ManagedUser["participationStatus"];
  umbralAusenciasJustificadas?: number | null;
  umbralAusenciasInjustificadas?: number | null;
  participacionObservaciones?: string | null;
};

type ApiUsersResponse = {
  data?: ApiUser[];
  meta?: Partial<UserManagementMeta>;
};

type ApiRole = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  _count?: {
    usuarios?: number;
  };
};

type ApiRolesResponse = {
  data?: ApiRole[];
};

type ListUsersParams = {
  q?: string;
  page?: number;
  pageSize?: number;
  roleId?: number | null;
  status?: "all" | "active" | "inactive";
  scope?: "citizen" | "personnel";
};

export function toManagedUser(user: ApiUser): ManagedUser {
  const fullName =
    [user.nombre, user.apellido].filter(Boolean).join(" ").trim() ||
    user.userId ||
    "Usuario sin nombre";
  const status = user.estado ?? "ACTIVO";
  const role = user.rol?.nombre ?? "user";
  const roleDescription = user.rol?.descripcion?.trim();

  return {
    id: user.id,
    userId: user.userId,
    fullName,
    email: user.email,
    role,
    status,
    approvalStatus: user.perfilCompleto === false ? "PENDIENTE" : status,
    initials: buildUserInitials(user),
    avatarUrl: user.avatarUrl ?? null,
    registeredAt: formatDateTime(user.createdAt),
    dni: user.documento || "Sin registrar",
    phone: user.celular || "Sin registrar",
    address: user.domicilio || "Sin registrar",
    locality: user.localidad || "Sin registrar",
    province: user.provincia || "Sin registrar",
    postalCode: user.codigoPostal || "Sin registrar",
    documentType: user.tipoDocumento || "Sin registrar",
    cuil: user.cuil || "Sin registrar",
    birthDate:
      formatDateTime(user.fechaNacimiento).split(",")[0] || "Sin registrar",
    gender: user.genero?.replaceAll("_", " ") || "Sin registrar",
    maritalStatus: user.estadoCivil?.replaceAll("_", " ") || "Sin registrar",
    nationality: user.nacionalidad?.replaceAll("_", " ") || "Sin registrar",
    profileComplete: user.perfilCompleto !== false,
    emergencyContactName: user.contactoEmergenciaNombre || "Sin registrar",
    emergencyContactPhone: user.contactoEmergenciaTelefono || "Sin registrar",
    medicalCoverage: user.coberturaMedica?.nombre || "Sin registrar",
    affiliateNumber: user.numeroAfiliado || "Sin registrar",
    identityPhotoUrl: user.fotoPerfilUrl ?? null,
    addressLat: user.domicilioLat ?? null,
    addressLng: user.domicilioLng ?? null,
    professorSpecialty: user.profesor?.especialidad || "Sin registrar",
    professorLicense: user.profesor?.matricula || "Sin registrar",
    professorDescription: user.profesor?.descripcion || "Sin registrar",
    lastAccess: "No disponible",
    failedAttempts: 0,
    permissionsSummary:
      roleDescription ||
      (role.toLowerCase().includes("admin")
        ? "Administra usuarios, roles y configuracion del sistema."
        : "Permisos asignados segun el rol configurado en el sistema."),
    participationStatus: user.estadoParticipacion ?? "HABILITADO",
    justifiedAbsenceThreshold: user.umbralAusenciasJustificadas ?? null,
    unjustifiedAbsenceThreshold: user.umbralAusenciasInjustificadas ?? null,
    participationObservations: user.participacionObservaciones ?? null,
  };
}

export async function getManagedUserRecord(id: string): Promise<ManagedUser> {
  const { data } = await axiosInstance.get<{ data: ApiUser }>(`/user-records/${id}`);
  return toManagedUser(data.data);
}

export async function listManagedUsers({
  q = "",
  page = 1,
  pageSize = 10,
  roleId,
  status = "all",
  scope,
}: ListUsersParams): Promise<UserManagementListResponse> {
  const { data } = await axiosInstance.get<ApiUsersResponse>("/users", {
    params: {
      q,
      page,
      pageSize,
      ...(roleId ? { rolId: roleId } : {}),
      ...(scope ? { scope } : {}),
      ...(status === "active"
        ? { estado: "ACTIVO" }
        : status === "inactive"
          ? { estado: "INACTIVOS" }
          : {}),
      sortBy: "createdAt",
      sortDir: "desc",
    },
  });

  return {
    users: (data.data ?? []).map(toManagedUser),
    meta: {
      total: data.meta?.total ?? 0,
      page: data.meta?.page ?? page,
      pageSize: data.meta?.pageSize ?? pageSize,
      pageCount: data.meta?.pageCount ?? 1,
    },
  };
}

export async function listManagedRoles(): Promise<ManagedRole[]> {
  const { data } = await axiosInstance.get<ApiRolesResponse>("/roles", {
    params: {
      page: 1,
      pageSize: 100,
      sortBy: "nombre",
      sortDir: "asc",
    },
  });

  return (data.data ?? []).map((role) => ({
    id: role.id,
    code: role.codigo,
    name: role.nombre,
    description: role.descripcion ?? null,
    active: role.activo,
    usersCount: role._count?.usuarios ?? 0,
  }));
}
