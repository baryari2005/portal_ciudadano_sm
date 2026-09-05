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
    <div className="grid h-[calc(100dvh-var(--topbar-h)-48px)] w-full grid-rows-[auto_minmax(0,1fr)] gap-6 overflow-hidden bg-[var(--brand-page)] p-8">
      <ExportUsersHeader />

      <section className="min-h-0 overflow-y-auto rounded-[24px] bg-[var(--brand-panel)] p-8 text-[var(--brand-ink)] shadow-sm">
        <div className="mb-7 flex items-center gap-4 border-b border-[var(--brand-border)] pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-highlight)]">
            <FileSpreadsheet className="h-7 w-7 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-[var(--brand-heading)]">
              Archivo Excel
            </h2>
            <p className="mt-1 text-sm font-medium text-[var(--brand-muted)]">
              Genera un archivo con hojas de usuarios y legajos.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-base font-medium leading-6 text-[var(--brand-text)]">
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
