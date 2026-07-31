// src/lib/api/users.ts
import { axiosInstance } from "@/lib/axios";

export type User = {
  id: string;
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  roleId: number;
  documentType?: string | null;
  documentNumber?: string | null;
  cuil?: string | null;
};

export type PersonnelFile = {
  employeeNumber?: number | null;

  admissionDate?: string | null;
  terminationDate?: string | null;
  employmentStatus: string;
  contractType?: string | null;
  position?: string | null;
  area?: string | null;
  department?: string | null;
  category?: string | null;
  // 👇 AGREGAR ESTOS DOS CAMPOS
  matriculaProvincial?: string | null;
  matriculaNacional?: string | null;
  notes?: string | null;
};

// helpers actuales
const s = (v?: string | null) => (v && v.trim() !== "" ? v.trim() : undefined);
const n = (v?: number | null) =>
  typeof v === "number" && !Number.isNaN(v) ? v : undefined;

// 👇 NUEVO helper que devuelve null (para que la clave SIEMPRE viaje)
const sNull = (v?: string | null) => (v && v.trim() !== "" ? v.trim() : null);

export function cleanPersonnelFile(p: PersonnelFile): Partial<PersonnelFile> {
  return {
    employeeNumber: n(p.employeeNumber ?? null),
    admissionDate: s(p.admissionDate ?? undefined),
    terminationDate: s(p.terminationDate ?? undefined),
    employmentStatus: p.employmentStatus,
    contractType: s(p.contractType ?? undefined),
    position: s(p.position ?? undefined),
    area: s(p.area ?? undefined),
    department: s(p.department ?? undefined),
    category: s(p.category ?? undefined),

    // 👇 INCLUIR SIEMPRE LAS MATRÍCULAS (null si están vacías)
    matriculaProvincial: sNull(p.matriculaProvincial ?? null),
    matriculaNacional: sNull(p.matriculaNacional ?? null),

    notes: s(p.notes ?? undefined),
  };
}

export async function getUser(id: string) {
  const { data } = await axiosInstance.get(`/users/${id}`);
  return data as User;
}

export async function getUserPersonnelFile(id: string) {
  const { data } = await axiosInstance.get(`/users/${id}/legajo`);
  return data as PersonnelFile | null;
}

export async function upsertUserPersonnelFile(
  id: string,
  payload: PersonnelFile,
) {
  const body = cleanPersonnelFile(payload);
  const { data } = await axiosInstance.put(`/users/${id}/legajo`, body);
  return data as PersonnelFile;
}
