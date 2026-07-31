"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { axiosInstance } from "@/lib/axios";
import type { Cred, ExcelRow, PdfRow, Source } from "../types/types";
import type { ImportRowError } from "../types/import-users-ui.types";
import { parseImportUsersExcel } from "../services/import-users-excel.service";
import {
  getImportErrorMessage,
  importExcelRows,
  importPdfRows,
} from "../services/import-users-api.service";

export function useImportUsers() {
  const [source, setSource] = useState<Source>("pdf");
  const [rows, setRows] = useState<PdfRow[]>([]);
  const [excelRows, setExcelRows] = useState<ExcelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creds, setCreds] = useState<Cred[]>([]);
  const [rowErrors, setRowErrors] = useState<ImportRowError[]>([]);
  const [showHeadersModal, setShowHeadersModal] = useState(false);

  const acceptBySource = useMemo(
    () => (source === "pdf" ? "application/pdf" : ".xlsx,.xls,.csv"),
    [source],
  );

  function clearData() {
    setRows([]);
    setExcelRows([]);
    setCreds([]);
    setRowErrors([]);
  }

  async function handleUploadPdf(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setLoading(true);
    setCreds([]);
    setRowErrors([]);

    try {
      const formData = new FormData();

      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const { data } = await axiosInstance.post("/import/recibos", formData);
      setRows(data.rows);
      toast.success(`Se analizaron ${data.rows.length} fila del PDF`);
    } catch (error: unknown) {
      toast.error(getImportErrorMessage(error, "Error al procesar el PDF."));
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadExcel(file: File | null) {
    if (!file) {
      return;
    }

    setLoading(true);
    setCreds([]);
    setRowErrors([]);

    try {
      const parsedRows = await parseImportUsersExcel(file);
      setExcelRows(parsedRows);
      toast.success(
        `Se analizaron ${parsedRows.length} filas del archivo ${file.name}.`,
      );
    } catch (error: unknown) {
      toast.error(
        getImportErrorMessage(error, "Error al analizar la hoja de cálculo."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePdfAll() {
    if (!rows.length) {
      return;
    }

    setLoading(true);
    setCreds([]);
    setRowErrors([]);

    try {
      const result = await importPdfRows(rows);
      setCreds(result.creds);
      setRowErrors(result.errors);

      if (result.failCount > 0) {
        toast.warning(
          `Importación completada con ${result.okCount} éxitos y ${result.failCount} errores`,
        );
        return;
      }

      toast.success(`Importación completada con ${result.okCount} éxitos`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateExcelAll() {
    if (!excelRows.length) {
      return;
    }

    setLoading(true);
    setCreds([]);
    setRowErrors([]);

    try {
      const result = await importExcelRows(excelRows);
      setCreds(result.creds);
      setRowErrors(result.errors);

      if (result.failCount > 0) {
        toast.warning(
          `Importación completada con ${result.okCount} éxitos y ${result.failCount} errores`,
        );
        return;
      }

      toast.success(`Importación completada con ${result.okCount} éxitos`);
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!creds.length) {
      return;
    }

    const header = "userId,email,tempPassword\n";
    const body = creds
      .map((row) => `${row.userId},${row.email},${row.tempPassword}`)
      .join("\n");

    const blob = new Blob([header + body], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "temporary-passwords.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return {
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
  };
}
