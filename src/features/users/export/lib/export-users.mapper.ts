import type {
  LegajoExportRow,
  UserExportRow,
  UserWithLegajo,
} from "../types/export-users.types";
import { formatCuil, titleCase, toYMD } from "./export-users.format";

export function toUserExportRow(u: UserWithLegajo): UserExportRow {
  const apellido = titleCase(u.apellido);
  const nombre = titleCase(u.nombre);

  return {
    userId: u.userId,
    email: u.email,
    nombre,
    apellido,
    nombreCompleto: [apellido ?? "", nombre ?? ""].join(" ").trim(),
    fechaNacimiento: toYMD(u.fechaNacimiento),
    genero: (u.genero as string) ?? null,
    estadoCivil: (u.estadoCivil as string) ?? null,
    nacionalidad: (u.nacionalidad as string) ?? null,
    tipoDocumento: (u.tipoDocumento as string) ?? null,
    documento: u.documento ?? null,
    cuil: formatCuil(u.cuil),
    celular: u.celular ?? null,
    domicilio: u.domicilio ?? null,
    codigoPostal: u.codigoPostal ?? null,
    rolId: u.rolId,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export function toLegajoExportRow(u: UserWithLegajo): LegajoExportRow | null {
  const l = u.legajo;
  if (!l) return null;

  return {
    userId: u.userId,
    numeroLegajo: l.numeroLegajo ?? null,
    fechaIngreso: toYMD(l.fechaIngreso),
    fechaEgreso: toYMD(l.fechaEgreso),
    estadoLaboral: (l.estadoLaboral as string) ?? null,
    tipoContrato: (l.tipoContrato as string) ?? null,
    puesto: l.puesto ?? null,
    area: l.area ?? null,
    departamento: l.departamento ?? null,
    categoria: l.categoria ?? null,
    matriculaProvincial: l.matriculaProvincial ?? null,
    matriculaNacional: l.matriculaNacional ?? null,
    observaciones: l.observaciones ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}
