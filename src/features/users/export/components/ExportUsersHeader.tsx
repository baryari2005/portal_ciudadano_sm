import { FileSpreadsheet } from "lucide-react";

export function ExportUsersHeader() {
  return (
    <header>
      <h1 className="flex items-center gap-3 text-3xl font-extrabold leading-tight text-[#003A22]">
        <FileSpreadsheet className="h-7 w-7 text-[#1D4F36]" />
        Exportar usuarios
      </h1>
      <p className="mt-2 text-base font-medium text-[#5F6F68]">
        Descarga usuarios y legajos en un archivo Excel.
      </p>
    </header>
  );
}
