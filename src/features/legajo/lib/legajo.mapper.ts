import { LegajoDto } from "../schemas/legajo.schema";
import { fromYMD, toYMD, emptyToNull } from "./legajo.date";
import {
  EMPLOYMENT_STATUS,
  CONTRACT_TYPES,
} from "@/features/users/schemas/legajo.schema";

type EmploymentStatus = LegajoDto["employmentStatus"];
type ContractType = Exclude<LegajoDto["contractType"], null | undefined>;

type LegajoDbLike = {
  numeroLegajo?: string | number | null;
  fechaIngreso?: Date | null;
  fechaEgreso?: Date | null;
  estadoLaboral?: string | null;
  tipoContrato?: string | null;
  puesto?: string | null;
  area?: string | null;
  departamento?: string | null;
  categoria?: string | null;
  matriculaProvincial?: string | null;
  matriculaNacional?: string | null;
  observaciones?: string | null;
};

function toNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isEmploymentStatus(value: unknown): value is EmploymentStatus {
  return (
    typeof value === "string" &&
    EMPLOYMENT_STATUS.includes(value as EmploymentStatus)
  );
}

function isContractType(value: unknown): value is ContractType {
  return (
    typeof value === "string" && CONTRACT_TYPES.includes(value as ContractType)
  );
}

export function mapLegajoDbToDto(legajo: LegajoDbLike): LegajoDto {
  return {
    employeeNumber: toNullableNumber(legajo.numeroLegajo),
    admissionDate: legajo.fechaIngreso ? toYMD(legajo.fechaIngreso) : null,
    terminationDate: legajo.fechaEgreso ? toYMD(legajo.fechaEgreso) : null,
    employmentStatus: isEmploymentStatus(legajo.estadoLaboral)
      ? legajo.estadoLaboral
      : "ACTIVO",
    contractType: isContractType(legajo.tipoContrato)
      ? legajo.tipoContrato
      : null,
    position: legajo.puesto ?? null,
    area: legajo.area ?? null,
    department: legajo.departamento ?? null,
    category: legajo.categoria ?? null,
    matriculaProvincial: legajo.matriculaProvincial ?? null,
    matriculaNacional: legajo.matriculaNacional ?? null,
    notes: legajo.observaciones ?? null,
  };
}

export function mapLegajoDtoToDb(dto: LegajoDto) {
  return {
    numeroLegajo: dto.employeeNumber ?? null,
    fechaIngreso: fromYMD(dto.admissionDate),
    fechaEgreso: fromYMD(dto.terminationDate),
    estadoLaboral: dto.employmentStatus ?? null,
    tipoContrato: dto.contractType ?? null,
    puesto: dto.position ?? null,
    area: dto.area ?? null,
    departamento: dto.department ?? null,
    categoria: dto.category ?? null,
    matriculaProvincial: emptyToNull(dto.matriculaProvincial),
    matriculaNacional: emptyToNull(dto.matriculaNacional),
    observaciones: emptyToNull(dto.notes),
  };
}
