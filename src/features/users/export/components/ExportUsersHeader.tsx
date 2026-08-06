import { FileSpreadsheet } from "lucide-react";

export function ExportUsersHeader() {
  return (
    <header>
      <h1 className="flex items-center gap-3 text-3xl font-extrabold leading-tight text-[var(--brand-heading)]">
        <FileSpreadsheet className="h-7 w-7 text-[var(--brand-primary)]" />
        Exportar usuarios
      </h1>
      <p className="mt-2 text-base font-medium text-[var(--brand-muted)]">
        Descarga usuarios y legajos en un archivo Excel.
      </p>
    </header>
  );
}
