import { CheckCircle2, LockKeyhole, MoreHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function UserActionButtons() {
  return (
    <div className="grid gap-3 border-t border-[#e0e4dc] pt-5 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <Button className="h-12 rounded-lg bg-[#00613a] font-bold text-white hover:bg-[#004f30]">
        <CheckCircle2 className="h-5 w-5" />
        Aprobar
      </Button>
      <Button
        variant="outline"
        className="h-12 rounded-lg border-[#d8ddd4] font-bold text-foreground hover:bg-red-50 hover:text-red-700"
      >
        <X className="h-5 w-5 text-red-600" />
        Rechazar
      </Button>
      <Button
        variant="outline"
        className="h-12 rounded-lg border-[#d8ddd4] font-bold text-foreground hover:bg-[#edf5e7] hover:text-primary"
      >
        <LockKeyhole className="h-5 w-5" />
        Bloquear
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-12 w-full rounded-lg border-[#d8ddd4] sm:w-14"
        aria-label="Mas opciones"
      >
        <MoreHorizontal className="h-5 w-5" />
      </Button>
    </div>
  );
}
