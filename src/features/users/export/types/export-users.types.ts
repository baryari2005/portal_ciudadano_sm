import type { Legajo, Usuario } from "@prisma/client";

export type UserWithLegajo = Usuario & {
  legajo: Legajo | null;
};

export type UserExportRow = {
  userId: string | null;
  email: string;
  nombre: string | null;
  apellido: string | null;
  nombreCompleto: string;
  fechaNacimiento: string | null;
  genero: string | null;
  estadoCivil: string | null;
  nacionalidad: string | null;
  tipoDocumento: string | null;
  documento: string | null;
  cuil: string | null;
  celular: string | null;
  domicilio: string | null;
  codigoPostal: string | null;
  rolId: number;
  createdAt: string;
  updatedAt: string;
};

export type LegajoExportRow = {
  userId: string | null;
  numeroLegajo: number | null;
  fechaIngreso: string | null;
  fechaEgreso: string | null;
  estadoLaboral: string | null;
  tipoContrato: string | null;
  puesto: string | null;
  area: string | null;
  departamento: string | null;
  categoria: string | null;
  matriculaProvincial: string | null;
  matriculaNacional: string | null;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExportUsersResult = {
  buffer: ArrayBuffer;
  filename: string;
  usersCount: number;
  legajosCount: number;
  elapsedMs: number;
};

export type ExportUsersStats = {
  users: number;
  legajos: number;
  elapsedMs: number;
  filename?: string;
};
