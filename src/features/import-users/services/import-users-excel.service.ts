import * as XLSX from "xlsx";
import {
  StringOrNull,
  nullifyEmpty,
  normalizeExcelDate,
} from "@/lib/import-excel-helpers";
import type { ExcelRow } from "../types/types";

type ExcelRecord = Record<string, unknown>;

function getExcelValue(row: ExcelRecord, key: string): unknown {
  return row[key];
}

export async function parseImportUsersExcel(file: File): Promise<ExcelRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const json = XLSX.utils.sheet_to_json<ExcelRecord>(worksheet, {
    defval: null,
  });

  return json.map((row) => {
    const userId = getExcelValue(row, "userId");
    const tipoDocumento = getExcelValue(row, "tipoDocumento");
    const documento = getExcelValue(row, "documento");
    const cuil = getExcelValue(row, "cuil");
    const email = getExcelValue(row, "email");
    const nombre = getExcelValue(row, "nombre");
    const apellido = getExcelValue(row, "apellido");
    const rawFechaNacimiento = getExcelValue(row, "fechaNacimiento");
    const rawFechaIngreso = getExcelValue(row, "fechaIngreso");
    const rawFechaEgreso = getExcelValue(row, "fechaEgreso");
    const celular = getExcelValue(row, "celular");
    const domicilio = getExcelValue(row, "domicilio");
    const codigoPostal = getExcelValue(row, "codigoPostal");
    const estadoCivil = getExcelValue(row, "estadoCivil");
    const nacionalidad = getExcelValue(row, "nacionalidad");
    const legajo =
      getExcelValue(row, "numeroLegajo") ?? getExcelValue(row, "legajo");
    const genero = getExcelValue(row, "genero");
    const matriculaProvincial = getExcelValue(row, "matriculaProvincial");
    const matriculaNacional = getExcelValue(row, "matriculaNacional");
    const estadoLaboral = getExcelValue(row, "estadoLaboral");
    const tipoContrato = getExcelValue(row, "tipoContrato");
    const puesto = getExcelValue(row, "puesto");
    const area = getExcelValue(row, "area");
    const departamento = getExcelValue(row, "departamento");
    const categoria = getExcelValue(row, "categoria");
    const observaciones = getExcelValue(row, "observaciones");

    return {
      userId: nullifyEmpty(StringOrNull(userId)),
      email: nullifyEmpty(StringOrNull(email)),
      nombre: nullifyEmpty(StringOrNull(nombre)),
      apellido: nullifyEmpty(StringOrNull(apellido)),
      fechaNacimiento: normalizeExcelDate(rawFechaNacimiento),
      fechaIngreso: normalizeExcelDate(rawFechaIngreso),
      fechaEgreso: normalizeExcelDate(rawFechaEgreso),
      genero: nullifyEmpty(StringOrNull(genero)),
      estadoCivil: nullifyEmpty(StringOrNull(estadoCivil)),
      nacionalidad: nullifyEmpty(StringOrNull(nacionalidad)),
      legajo: nullifyEmpty(StringOrNull(legajo)),
      tipoDocumento: nullifyEmpty(StringOrNull(tipoDocumento)),
      documento: nullifyEmpty(StringOrNull(documento)),
      cuil: nullifyEmpty(StringOrNull(cuil)),
      puesto: nullifyEmpty(StringOrNull(puesto)),
      celular: nullifyEmpty(StringOrNull(celular)),
      domicilio: nullifyEmpty(StringOrNull(domicilio)),
      codigoPostal: nullifyEmpty(StringOrNull(codigoPostal)),
      matriculaProvincial: nullifyEmpty(StringOrNull(matriculaProvincial)),
      matriculaNacional: nullifyEmpty(StringOrNull(matriculaNacional)),
      estadoLaboral: nullifyEmpty(StringOrNull(estadoLaboral)),
      tipoContrato: nullifyEmpty(StringOrNull(tipoContrato)),
      area: nullifyEmpty(StringOrNull(area)),
      departamento: nullifyEmpty(StringOrNull(departamento)),
      categoria: nullifyEmpty(StringOrNull(categoria)),
      observaciones: nullifyEmpty(StringOrNull(observaciones)),
    };
  });
}
