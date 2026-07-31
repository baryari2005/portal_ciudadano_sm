import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import type {
  ExportUsersResult,
  UserWithLegajo,
} from "../types/export-users.types";
import { toLegajoExportRow, toUserExportRow } from "../lib/export-users.mapper";
import { buildExportFilename } from "../lib/export-users.format";

export async function generateUsersExport(): Promise<ExportUsersResult> {
  const started = Date.now();

  const usuarios: UserWithLegajo[] = await prisma.usuario.findMany({
    include: { legajo: true },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });

  const usersRows = usuarios.map(toUserExportRow);
  const legajosRows = usuarios
    .map(toLegajoExportRow)
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const wb = XLSX.utils.book_new();
  const wsUsers = XLSX.utils.json_to_sheet(usersRows);
  const wsLegajos = XLSX.utils.json_to_sheet(legajosRows);

  XLSX.utils.book_append_sheet(wb, wsUsers, "Usuarios");
  XLSX.utils.book_append_sheet(wb, wsLegajos, "Legajos");

  const buffer = XLSX.write(wb, {
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;

  return {
    buffer,
    filename: buildExportFilename(),
    usersCount: usuarios.length,
    legajosCount: legajosRows.length,
    elapsedMs: Date.now() - started,
  };
}
