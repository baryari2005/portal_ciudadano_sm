"use client";

import { ArrowLeft, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/components/shared/admin-patterns";
import { formatMessage } from "@/utils/formatters";

type Props = {
  saving: boolean;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  showCancel?: boolean;
};

export function RoleFormActions({ saving, onCancel, onSave, showCancel = true }: Props) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--brand-border)]/70 pt-6 sm:flex-row sm:justify-end">
      {showCancel ? <Button
        className={adminSecondaryButtonClass}
        variant="outline"
        onClick={onCancel}
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Button> : null}

      <Button
        onClick={onSave}
        disabled={saving}
        className={adminPrimaryButtonClass}
      >
        {saving ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {formatMessage("Guardando...")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Save className="h-4 w-4" />
            Guardar cambios
          </span>
        )}
      </Button>
    </div>
  );
}
