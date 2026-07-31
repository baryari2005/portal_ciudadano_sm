import axios from "axios";
import { axiosInstance } from "@/lib/axios";
import { extractDniFromCuil } from "@/lib/cuil";
import type { Cred, ExcelRow, PdfRow } from "../types/types";
import type {
  ImportExecutionResult,
  ImportRowError,
} from "../types/import-users-ui.types";

type ImportUpsertResponse = {
  user?: {
    userId?: string;
    email?: string;
  };
  legajo?: unknown;
  tempPassword?: string;
};

type ExcelPayload = {
  user: {
    userId: string | null;
    documentType: string | null;
    documentNumber: string | null;
    cuil: string | null;
    email: string | null;
    nombre: string | null;
    apellido: string | null;
    fechaNacimiento: string | null;
    celular: string | null;
    domicilio: string | null;
    codigoPostal: string | null;
    genero: string | null;
    estadoCivil: string | null;
    nacionalidad: string | null;
    rolId: number;
  };
  legajo: {
    employeeNumber: number | null;
    admissionDate: string | null;
    terminationDate: string | null;
    employmentStatus: string;
    contractType: string | null;
    position: string | null;
    area: string | null;
    department: string | null;
    category: string | null;
    notes: string | null;
    matriculaProvincial: string | null;
    matriculaNacional: string | null;
  };
};

type PdfPayload = {
  user: {
    userId: string;
    documentType: string;
    documentNumber: string | null;
    cuil: string | null;
    email: string;
    nombre: string;
    apellido: string;
    rolId: number;
  };
  legajo: {
    employeeNumber: number | null;
    admissionDate: string | null;
    terminationDate: string | null;
    employmentStatus: string;
    contractType: string | null;
    position: string | null;
    area: string | null;
    department: string | null;
    category: string | null;
    notes: string | null;
  };
};

function formatValidationIssues(issues: unknown): string | null {
  if (!Array.isArray(issues)) {
    return null;
  }

  const messages = issues
    .map((issue) => {
      if (!issue || typeof issue !== "object") {
        return null;
      }

      const path =
        "path" in issue && Array.isArray((issue as { path?: unknown[] }).path)
          ? (issue as { path: unknown[] }).path.filter(Boolean).join(".")
          : "";

      const message =
        "message" in issue &&
        typeof (issue as { message?: unknown }).message === "string"
          ? (issue as { message: string }).message
          : "Validation error";

      return path ? `${path}: ${message}` : message;
    })
    .filter((value): value is string => Boolean(value));

  return messages.length ? messages.join(" | ") : null;
}

export function getImportErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const responseData = error.response?.data;

  if (responseData && typeof responseData === "object") {
    const data = responseData as {
      message?: unknown;
      error?: unknown;
      issues?: unknown;
    };

    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }

    if (Array.isArray(data.message)) {
      const messages = data.message.filter(
        (value): value is string => typeof value === "string",
      );
      if (messages.length) {
        return messages.join(" | ");
      }
    }

    const issuesMessage = formatValidationIssues(data.issues);
    if (issuesMessage) {
      return issuesMessage;
    }

    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  }

  return error.message || fallback;
}

function createPdfRowRef(row: PdfRow): string {
  return (
    [row.apellidoNombre, row.legajo, row.cuil].filter(Boolean).join(" | ") ||
    "unidentified_pdf_row"
  );
}

function createExcelRowRef(row: ExcelRow): string {
  return (
    [row.userId, row.email, row.documento, row.cuil]
      .filter(Boolean)
      .join(" | ") || "unidentified_excel_row"
  );
}

function buildPdfImportPayload(row: PdfRow): PdfPayload {
  const [apellido = "", ...rest] = (row.apellidoNombre ?? "")
    .trim()
    .split(/\s+/);
  const nombre = rest.join(" ").trim();

  const baseId =
    apellido && nombre
      ? `${apellido}.${nombre}`.toLowerCase().replace(/[^a-zñáéíóú0-9]+/g, ".")
      : row.legajo || row.cuil || `u_${Date.now()}`;

  return {
    user: {
      userId: baseId,
      documentType: "DNI",
      documentNumber: extractDniFromCuil(row.cuil || ""),
      cuil: row.cuil || null,
      email: `${baseId}@example.com`,
      nombre,
      apellido,
      rolId: 2,
    },
    legajo: {
      employeeNumber: row.legajo ? Number(row.legajo) : null,
      admissionDate: row.fechaIngreso || null,
      terminationDate: null,
      employmentStatus: "ACTIVO",
      contractType: null,
      position: null,
      area: null,
      department: null,
      category: null,
      notes: row.obraSocial ? `Obra social: ${row.obraSocial}` : null,
    },
  };
}

function buildExcelImportPayload(row: ExcelRow): ExcelPayload {
  return {
    user: {
      userId: row.userId,
      documentType: row.tipoDocumento,
      documentNumber: row.documento,
      cuil: row.cuil || null,
      email: row.email,
      nombre: row.nombre,
      apellido: row.apellido,
      fechaNacimiento: row.fechaNacimiento,
      celular: row.celular,
      domicilio: row.domicilio,
      codigoPostal: row.codigoPostal,
      genero: row.genero,
      estadoCivil: row.estadoCivil,
      nacionalidad: row.nacionalidad,
      rolId: 2,
    },
    legajo: {
      employeeNumber: row.legajo ? Number(row.legajo) : null,
      admissionDate: row.fechaIngreso || null,
      terminationDate: null,
      employmentStatus: "ACTIVO",
      contractType: "INDETERMINADO",
      position: row.puesto,
      area: row.area,
      department: row.departamento,
      category: row.categoria,
      notes: row.observaciones,
      matriculaProvincial: row.matriculaProvincial,
      matriculaNacional: row.matriculaNacional,
    },
  };
}

function toCred(data: ImportUpsertResponse): Cred | null {
  if (!data?.user?.userId || !data?.user?.email || !data?.tempPassword) {
    return null;
  }

  return {
    userId: data.user.userId,
    email: data.user.email,
    tempPassword: data.tempPassword,
    status: data.legajo ? "updated" : "created",
  };
}

async function importSingleRow(
  payload: PdfPayload | ExcelPayload,
): Promise<ImportUpsertResponse> {
  const { data } = await axiosInstance.post<ImportUpsertResponse>(
    "/users/import-upsert?setTemp=1",
    payload,
  );
  return data;
}

async function executeImport<T>(
  rows: T[],
  source: "pdf" | "excel",
  buildPayload: (row: T) => PdfPayload | ExcelPayload,
  buildRowRef: (row: T) => string,
): Promise<ImportExecutionResult> {
  const creds: Cred[] = [];
  const errors: ImportRowError[] = [];
  let okCount = 0;
  let failCount = 0;

  for (const [index, row] of rows.entries()) {
    try {
      const payload = buildPayload(row);
      const data = await importSingleRow(payload);
      const cred = toCred(data);

      if (cred) {
        creds.push(cred);
      }

      okCount++;
    } catch (error) {
      failCount++;

      errors.push({
        index: index + 1,
        source,
        rowRef: buildRowRef(row),
        message: getImportErrorMessage(error, "Import failed"),
        status: axios.isAxiosError(error) ? error.response?.status : undefined,
      });
    }
  }

  return {
    creds,
    okCount,
    failCount,
    errors,
  };
}

export async function importPdfRows(
  rows: PdfRow[],
): Promise<ImportExecutionResult> {
  return executeImport(rows, "pdf", buildPdfImportPayload, createPdfRowRef);
}

export async function importExcelRows(
  rows: ExcelRow[],
): Promise<ImportExecutionResult> {
  return executeImport(
    rows,
    "excel",
    buildExcelImportPayload,
    createExcelRowRef,
  );
}
