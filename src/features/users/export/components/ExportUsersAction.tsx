import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

type Props = {
  loading: boolean;
  onExport: () => Promise<void> | void;
};

export function ExportUsersAction({ loading, onExport }: Props) {
  return (
    <Button
      onClick={onExport}
      disabled={loading}
      className="h-12 rounded-xl bg-[var(--brand-primary-strong)] px-8 text-base font-bold text-white shadow-sm hover:bg-[var(--brand-heading)]"
    >
      {loading ? (
        <>
          <FileDown className="h-5 w-5 mr-2 animate-bounce" />
          Exportando...
        </>
      ) : (
        <>
          <FileDown className="h-5 w-5 mr-2" />
          Exportar a Excel
        </>
      )}
    </Button>
  );
}
