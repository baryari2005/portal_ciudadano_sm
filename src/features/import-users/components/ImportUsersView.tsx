// "use client";

// import { useMemo, useState } from "react";
// import { Users } from "lucide-react";
// import { toast } from "sonner";
// import * as XLSX from "xlsx";
// import axios from "axios";

// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Separator } from "@/components/ui/separator";
// import { axiosInstance } from "@/lib/axios";
// import { extractDniFromCuil } from "@/lib/cuil";

// import SourceSelector from "./SourceSelector";
// import UploadField from "./UploadField";
// import PreviewPdfTable from "./PreviewPdfTable";
// import PreviewExcelTable from "./PreviewExcelTable";
// import CredentialsTable from "./CredentialsTable";
// import ExcelHeadersDialog from "./ExcelHeadersDialog";

// import { Source, PdfRow, ExcelRow, Cred } from "../types/types";
// import {
//   StringOrNull,
//   nullifyEmpty,
//   normalizeExcelDate,
// } from "@/lib/import-excel-helpers";

// type ExcelRecord = Record<string, unknown>;

// function getErrorMessage(error: unknown, fallback: string): string {
//   if (axios.isAxiosError(error)) {
//     const responseMessage = error.response?.data;

//     if (
//       responseMessage &&
//       typeof responseMessage === "object" &&
//       "message" in responseMessage &&
//       typeof responseMessage.message === "string"
//     ) {
//       return responseMessage.message;
//     }

//     return error.message || fallback;
//   }

//   if (error instanceof Error) {
//     return error.message;
//   }

//   return fallback;
// }

// function getExcelValue(row: ExcelRecord, key: string): unknown {
//   return row[key];
// }

// export default function ImportUsersView() {
//   const [source, setSource] = useState<Source>("pdf");
//   const [rows, setRows] = useState<PdfRow[]>([]);
//   const [excelRows, setExcelRows] = useState<ExcelRow[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [creds, setCreds] = useState<Cred[]>([]);
//   const [showHeadersModal, setShowHeadersModal] = useState(false);

//   function clearData() {
//     setRows([]);
//     setExcelRows([]);
//     setCreds([]);
//   }

//   const acceptBySource = useMemo(
//     () => (source === "pdf" ? "application/pdf" : ".xlsx,.xls,.csv"),
//     [source]
//   );

//   async function handleUploadPdf(files: FileList | null) {
//     if (!files?.length) return;

//     setLoading(true);
//     setCreds([]);

//     try {
//       const fd = new FormData();
//       Array.from(files).forEach((file) => fd.append("files", file));

//       const { data } = await axiosInstance.post("/import/recibos", fd);

//       setRows(data.rows);
//       toast.success(`Leímos ${data.rows.length} registros desde PDF`);
//     } catch (error: unknown) {
//       toast.error(getErrorMessage(error, "No se pudo procesar el PDF"));
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function handleUploadExcel(file: File | null) {
//     if (!file) return;

//     setLoading(true);
//     setCreds([]);

//     try {
//       const buf = await file.arrayBuffer();
//       const wb = XLSX.read(buf, { type: "array" });
//       const shName = wb.SheetNames[0];
//       const ws = wb.Sheets[shName];

//       const json = XLSX.utils.sheet_to_json<ExcelRecord>(ws, {
//         defval: null,
//       });

//       const mapped: ExcelRow[] = json.map((row) => {
//         const userId = getExcelValue(row, "userId");
//         const tipoDocumento = getExcelValue(row, "tipoDocumento");
//         const documento = getExcelValue(row, "documento");
//         const cuil = getExcelValue(row, "cuil");
//         const email = getExcelValue(row, "email");
//         const nombre = getExcelValue(row, "nombre");
//         const apellido = getExcelValue(row, "apellido");

//         const rawFecha = getExcelValue(row, "fechaNacimiento");
//         const fechaNacimiento = normalizeExcelDate(rawFecha);

//         const rawFechaIngreso = getExcelValue(row, "fechaIngreso");
//         const fechaIngreso = normalizeExcelDate(rawFechaIngreso);

//         const rawFechaEgreso = getExcelValue(row, "fechaEgreso");
//         const fechaEgreso = normalizeExcelDate(rawFechaEgreso);

//         const celular = getExcelValue(row, "celular");
//         const domicilio = getExcelValue(row, "domicilio");
//         const codigoPostal = getExcelValue(row, "codigoPostal");
//         const estadoCivil = getExcelValue(row, "estadoCivil");
//         const nacionalidad = getExcelValue(row, "nacionalidad");
//         const legajo =
//           getExcelValue(row, "numeroLegajo") ?? getExcelValue(row, "legajo");
//         const genero = getExcelValue(row, "genero");
//         const matriculaProvincial = getExcelValue(row, "matriculaProvincial");
//         const matriculaNacional = getExcelValue(row, "matriculaNacional");
//         const estadoLaboral = getExcelValue(row, "estadoLaboral");
//         const tipoContrato = getExcelValue(row, "tipoContrato");
//         const puesto = getExcelValue(row, "puesto");
//         const area = getExcelValue(row, "area");
//         const departamento = getExcelValue(row, "departamento");
//         const categoria = getExcelValue(row, "categoria");
//         const observaciones = getExcelValue(row, "observaciones");

//         return {
//           userId: nullifyEmpty(StringOrNull(userId)),
//           email: nullifyEmpty(StringOrNull(email)),
//           nombre: nullifyEmpty(StringOrNull(nombre)),
//           apellido: nullifyEmpty(StringOrNull(apellido)),
//           fechaNacimiento,
//           fechaIngreso,
//           fechaEgreso,
//           genero: nullifyEmpty(StringOrNull(genero)),
//           estadoCivil: nullifyEmpty(StringOrNull(estadoCivil)),
//           nacionalidad: nullifyEmpty(StringOrNull(nacionalidad)),
//           legajo: nullifyEmpty(StringOrNull(legajo)),
//           tipoDocumento: nullifyEmpty(StringOrNull(tipoDocumento)),
//           documento: nullifyEmpty(StringOrNull(documento)),
//           cuil: nullifyEmpty(StringOrNull(cuil)),
//           puesto: nullifyEmpty(StringOrNull(puesto)),
//           celular: nullifyEmpty(StringOrNull(celular)),
//           domicilio: nullifyEmpty(StringOrNull(domicilio)),
//           codigoPostal: nullifyEmpty(StringOrNull(codigoPostal)),
//           matriculaProvincial: nullifyEmpty(
//             StringOrNull(matriculaProvincial)
//           ),
//           matriculaNacional: nullifyEmpty(StringOrNull(matriculaNacional)),
//           estadoLaboral: nullifyEmpty(StringOrNull(estadoLaboral)),
//           tipoContrato: nullifyEmpty(StringOrNull(tipoContrato)),
//           area: nullifyEmpty(StringOrNull(area)),
//           departamento: nullifyEmpty(StringOrNull(departamento)),
//           categoria: nullifyEmpty(StringOrNull(categoria)),
//           observaciones: nullifyEmpty(StringOrNull(observaciones)),
//         };
//       });

//       setExcelRows(mapped);
//       toast.success(`Leímos ${mapped.length} registros desde ${file.name}`);
//     } catch (error: unknown) {
//       console.error(error);
//       toast.error(getErrorMessage(error, "No se pudo leer el archivo"));
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function handleCreateAll() {
//     if (!rows.length) return;

//     setLoading(true);
//     setCreds([]);

//     try {
//       let okCount = 0;
//       let failCount = 0;
//       const out: Cred[] = [];

//       for (const row of rows) {
//         try {
//           const [ap, ...rest] = (row.apellidoNombre ?? "").trim().split(/\s+/);
//           const nombre = rest.join(" ").trim();
//           const apellido = ap ?? "";
//           const baseId =
//             apellido && nombre
//               ? `${apellido}.${nombre}`
//                 .toLowerCase()
//                 .replace(/[^a-zñáéíóú0-9]+/g, ".")
//               : row.legajo || row.cuil || `u_${Date.now()}`;

//           const payload = {
//             user: {
//               userId: baseId,
//               documentType: "DNI",
//               documentNumber: extractDniFromCuil(row.cuil || ""),
//               cuil: row.cuil || null,
//               email: `${baseId}@example.com`,
//               nombre,
//               apellido,
//               rolId: 2,
//             },
//             legajo: {
//               employeeNumber: row.legajo ? Number(row.legajo) : null,
//               admissionDate: row.fechaIngreso || null,
//               terminationDate: null,
//               employmentStatus: "ACTIVO",
//               contractType: null,
//               position: null,
//               area: null,
//               department: null,
//               category: null,
//               notes: row.obraSocial ? `Obra social: ${row.obraSocial}` : null,
//             },
//           };

//           const { data } = await axiosInstance.post(
//             "/users/import-upsert?setTemp=1",
//             payload
//           );

//           if (data?.user?.userId && data?.user?.email && data?.tempPassword) {
//             out.push({
//               userId: data.user.userId,
//               email: data.user.email,
//               tempPassword: data.tempPassword,
//               status: data?.legajo ? "updated" : "created",
//             });
//           }

//           okCount++;
//         } catch {
//           failCount++;
//         }
//       }

//       setCreds(out);
//       toast.success(`Listo: ${okCount} ok, ${failCount} con error`);
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function handleCreateExcelAll() {
//     if (!excelRows.length) return;

//     setLoading(true);
//     setCreds([]);

//     try {
//       let okCount = 0;
//       let failCount = 0;
//       const out: Cred[] = [];

//       for (const row of excelRows) {
//         try {
//           const payload = {
//             user: {
//               userId: row.userId,
//               documentType: row.tipoDocumento,
//               documentNumber: row.documento,
//               cuil: row.cuil || null,
//               email: row.email,
//               nombre: row.nombre,
//               apellido: row.apellido,
//               fechaNacimiento: row.fechaNacimiento,
//               celular: row.celular,
//               domicilio: row.domicilio,
//               codigoPostal: row.codigoPostal,
//               genero: row.genero,
//               estadoCivil: row.estadoCivil,
//               nacionalidad: row.nacionalidad,
//               rolId: 2,
//             },
//             legajo: {
//               employeeNumber: row.legajo ? Number(row.legajo) : null,
//               admissionDate: row.fechaIngreso || null,
//               terminationDate: null,
//               employmentStatus: "ACTIVO",
//               contractType: "INDETERMINADO",
//               position: row.puesto,
//               area: row.area,
//               department: row.departamento,
//               category: row.categoria,
//               notes: row.observaciones,
//               matriculaProvincial: row.matriculaProvincial,
//               matriculaNacional: row.matriculaNacional,
//             },
//           };

//           const { data } = await axiosInstance.post(
//             "/users/import-upsert?setTemp=1",
//             payload
//           );

//           if (data?.user?.userId && data?.user?.email && data?.tempPassword) {
//             out.push({
//               userId: data.user.userId,
//               email: data.user.email,
//               tempPassword: data.tempPassword,
//               status: data?.legajo ? "updated" : "created",
//             });
//           }

//           okCount++;
//         } catch (error) {
//           failCount++;

//           if (axios.isAxiosError(error)) {
//             console.error("Import row error", {
//               row,
//               status: error.response?.status,
//               data: error.response?.data,
//             });
//           } else {
//             console.error("Import row error", { row, error });
//           }
//         }
//       }

//       setCreds(out);
//       toast.success(`Listo: ${okCount} ok, ${failCount} con error`);
//     } finally {
//       setLoading(false);
//     }
//   }

//   function downloadCSV() {
//     if (!creds.length) return;

//     const header = "userId,email,tempPassword\n";
//     const body = creds
//       .map((row) => `${row.userId},${row.email},${row.tempPassword}`)
//       .join("\n");

//     const blob = new Blob([header + body], {
//       type: "text/csv;charset=utf-8",
//     });

//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");

//     a.href = url;
//     a.download = "claves-temporales.csv";
//     document.body.appendChild(a);
//     a.click();
//     a.remove();
//     URL.revokeObjectURL(url);
//   }

//   return (
//     <div className="grid gap-6">
//       <Card>
//         <CardHeader className="flex items-center justify-between">
//           <CardTitle className="flex items-center text-2xl">
//             <Users className="mr-2" />
//             Importar Usuarios
//           </CardTitle>
//         </CardHeader>

//         <CardContent className="space-y-4">
//           <SourceSelector
//             source={source}
//             setSource={setSource}
//             clearData={clearData}
//           />

//           <UploadField
//             source={source}
//             accept={acceptBySource}
//             onPdfUpload={handleUploadPdf}
//             onExcelUpload={handleUploadExcel}
//             onOpenHeaders={() => setShowHeadersModal(true)}
//           />

//           {source === "pdf" ? (
//             <PreviewPdfTable
//               rows={rows}
//               loading={loading}
//               onCreateAll={handleCreateAll}
//             />
//           ) : (
//             <PreviewExcelTable
//               rows={excelRows}
//               loading={loading}
//               onCreateAll={handleCreateExcelAll}
//             />
//           )}

//           <Separator />

//           <CredentialsTable creds={creds} onDownload={downloadCSV} />
//         </CardContent>
//       </Card>

//       <ExcelHeadersDialog
//         open={showHeadersModal}
//         onOpenChange={setShowHeadersModal}
//       />
//     </div>
//   );
// }

"use client";

import { UploadCloud } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import SourceSelector from "./SourceSelector";
import UploadField from "./UploadField";
import PreviewPdfTable from "./PreviewPdfTable";
import PreviewExcelTable from "./PreviewExcelTable";
import CredentialsTable from "./CredentialsTable";
import ExcelHeadersDialog from "./ExcelHeadersDialog";
import ImportUsersErrors from "./ImportUsersErrors";
import { useImportUsers } from "../hooks/useImportUsers";

export default function ImportUsersView() {
  const {
    source,
    rows,
    excelRows,
    loading,
    creds,
    rowErrors,
    showHeadersModal,
    acceptBySource,
    setSource,
    setShowHeadersModal,
    clearData,
    handleUploadPdf,
    handleUploadExcel,
    handleCreatePdfAll,
    handleCreateExcelAll,
    downloadCSV,
  } = useImportUsers();

  return (
    <div className="grid h-[calc(100dvh-var(--topbar-h)-48px)] w-full grid-rows-[auto_minmax(0,1fr)] gap-6 overflow-hidden bg-[#F7FBF5] p-8">
      <header>
        <h1 className="flex items-center gap-3 text-3xl font-extrabold leading-tight text-[#003A22]">
          <UploadCloud className="h-7 w-7 text-[#1D4F36]" />
          Importar usuarios
        </h1>
        <p className="mt-2 text-base font-medium text-[#5F6F68]">
          Carga usuarios desde PDF, Excel o CSV y revisa el resultado antes de
          guardar.
        </p>
      </header>

      <section className="min-h-0 overflow-y-auto rounded-[24px] bg-[#EEF6E9] p-8 text-[#173C2A] shadow-sm">
        <div className="space-y-5">
          <SourceSelector
            source={source}
            setSource={setSource}
            clearData={clearData}
          />

          <UploadField
            source={source}
            accept={acceptBySource}
            onPdfUpload={handleUploadPdf}
            onExcelUpload={handleUploadExcel}
            onOpenHeaders={() => setShowHeadersModal(true)}
          />

          {source === "pdf" ? (
            <PreviewPdfTable
              rows={rows}
              loading={loading}
              onCreateAll={handleCreatePdfAll}
            />
          ) : (
            <PreviewExcelTable
              rows={excelRows}
              loading={loading}
              onCreateAll={handleCreateExcelAll}
            />
          )}

          <ImportUsersErrors errors={rowErrors} />

          <Separator />

          <CredentialsTable creds={creds} onDownload={downloadCSV} />
        </div>
      </section>

      <ExcelHeadersDialog
        open={showHeadersModal}
        onOpenChange={setShowHeadersModal}
      />
    </div>
  );
}
