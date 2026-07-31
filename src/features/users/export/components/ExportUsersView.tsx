"use client";

import { FileSpreadsheet } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { ExportUsersHeader } from "./ExportUsersHeader";
import { ExportUsersAction } from "./ExportUsersAction";
import { ExportUsersStats } from "./ExportUsersStats";
import { useExportUsers } from "../hooks/useExportUsers";

export function ExportUsersView() {
  const { loading, stats, handleExport } = useExportUsers();

  return (
    <div className="grid h-[calc(100dvh-var(--topbar-h)-48px)] w-full grid-rows-[auto_minmax(0,1fr)] gap-6 overflow-hidden bg-[#F7FBF5] p-8">
      <ExportUsersHeader />

      <section className="min-h-0 overflow-y-auto rounded-[24px] bg-[#EEF6E9] p-8 text-[#173C2A] shadow-sm">
        <div className="mb-7 flex items-center gap-4 border-b border-[#C9D9C3] pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDEED2]">
            <FileSpreadsheet className="h-7 w-7 text-[#1D4F36]" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-[#003A22]">
              Archivo Excel
            </h2>
            <p className="mt-1 text-sm font-medium text-[#5F6F68]">
              Genera un archivo con hojas de usuarios y legajos.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-base font-medium leading-6 text-[#315644]">
            Exporta los datos principales del sistema en formato Excel para
            consultas, auditorias o resguardo operativo.
          </p>

          <ExportUsersAction loading={loading} onExport={handleExport} />

          <Separator />

          <ExportUsersStats stats={stats} />
        </div>
      </section>
    </div>
  );
}
