import { Legajo, Usuario } from "@prisma/client";
import { toYMD } from "./import-upsert.normalize";

export function toImportUpsertResponse(
  user: Usuario,
  savedLegajo: Legajo | null,
  tempPassword?: string,
) {
  return {
    user: {
      id: user.id,
      userId: user.userId,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      rolId: user.rolId,
      mustChangePassword: user.mustChangePassword,
    },
    legajo: savedLegajo
      ? {
          id: savedLegajo.id,
          employeeNumber: savedLegajo.numeroLegajo,
          admissionDate: savedLegajo.fechaIngreso
            ? toYMD(savedLegajo.fechaIngreso)
            : null,
          terminationDate: savedLegajo.fechaEgreso
            ? toYMD(savedLegajo.fechaEgreso)
            : null,
          estadoLaboral: savedLegajo.estadoLaboral,
          tipoContrato: savedLegajo.tipoContrato,
          matriculaProvincial: savedLegajo.matriculaProvincial ?? null,
          matriculaNacional: savedLegajo.matriculaNacional ?? null,
        }
      : null,
    tempPassword: tempPassword || undefined,
  };
}
