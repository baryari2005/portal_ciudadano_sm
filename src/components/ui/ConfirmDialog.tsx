"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CircleAlert, Loader2 } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  confirmDisabled?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title = "¿Estás seguro?",
  description = "Esta acción no se puede deshacer.",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  loading,
  icon,
  children,
  confirmDisabled,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="overflow-hidden rounded-2xl border-[#DDE5D8] bg-white p-0 shadow-[0_24px_70px_rgba(0,58,34,0.18)] sm:max-w-md">
        <DialogHeader className="border-b border-[#E4E9E3] bg-[#F7FAF3] px-5 pb-5 pt-5 sm:px-6">
          <div className="flex items-start gap-3 text-left">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#819B56]/18 text-[#1D4F36] ring-1 ring-[#819B56]/25 [&_svg]:h-5 [&_svg]:w-5">
              {icon ?? <CircleAlert aria-hidden="true" />}
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-lg font-semibold leading-6 text-[#1D4F36]">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-5 text-[#5F6B62]">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {children ? <div className="px-5 py-4 sm:px-6">{children}</div> : null}

        <DialogFooter className="border-t border-[#E4E9E3] bg-[#F7FAF3] px-5 py-4 sm:px-6">
          <DialogClose asChild>
            <Button
              variant="outline"
              className="h-11 rounded-lg border border-[#1D4F36]/25 bg-white px-5 text-[#1D4F36] shadow-sm hover:bg-[#EEF4E8] hover:text-[#1D4F36] focus-visible:ring-[#819B56]/35"
              disabled={loading}
            >
              {cancelLabel}
            </Button>
          </DialogClose>

          <Button
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
            className="h-11 rounded-lg bg-[#1D4F36] px-5 text-white shadow-sm hover:bg-[#153D29] focus-visible:ring-[#819B56]/35"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 [&_svg]:h-4 [&_svg]:w-4">
                {icon}
                <span>{confirmLabel}</span>
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
