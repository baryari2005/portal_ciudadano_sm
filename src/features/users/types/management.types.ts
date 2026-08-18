import type { LucideIcon } from "lucide-react";

export type ManagedUserStatus =
  "PENDIENTE" | "ACTIVO" | "RECHAZADO" | "BLOQUEADO";

export type ManagedUser = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
  status: ManagedUserStatus;
  approvalStatus: ManagedUserStatus;
  initials: string;
  avatarUrl: string | null;
  registeredAt: string;
  dni: string;
  phone: string;
  address: string;
  locality?: string;
  province?: string;
  postalCode?: string;
  documentType?: string;
  cuil?: string;
  birthDate: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  profileComplete?: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalCoverage?: string;
  affiliateNumber?: string;
  identityPhotoUrl?: string | null;
  addressLat?: number | null;
  addressLng?: number | null;
  professorSpecialty?: string;
  professorLicense?: string;
  professorDescription?: string;
  lastAccess: string;
  failedAttempts: number;
  permissionsSummary: string;
  participationStatus?: "HABILITADO" | "EN_REVISION" | "SUSPENDIDO_PROVISORIO";
  justifiedAbsenceThreshold?: number | null;
  unjustifiedAbsenceThreshold?: number | null;
  participationObservations?: string | null;
};

export type UserManagementMeta = {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type UserManagementListResponse = {
  users: ManagedUser[];
  meta: UserManagementMeta;
};

export type ManagedRole = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  usersCount: number;
};

export type DetailField = {
  label: string;
  value: string | number;
  status?: ManagedUserStatus;
};

export type DetailCard = {
  title: string;
  icon: LucideIcon;
  fields: DetailField[];
};
