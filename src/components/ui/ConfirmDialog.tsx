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
  loadingLabel?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  confirmDisabled?: boolean;
  mobilePresentation?: boolean;
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
  loadingLabel = "Procesando...",
  icon,
  children,
  confirmDisabled,
  mobilePresentation = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`overflow-hidden rounded-2xl border-[#DDE5D8] bg-white p-0 shadow-[0_24px_70px_rgba(0,58,34,0.18)] sm:max-w-md ${mobilePresentation ? "max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto overflow-x-hidden rounded-3xl md:max-h-none md:w-full md:overflow-hidden md:rounded-2xl" : ""}`}>
        <DialogHeader className={`border-b border-[#E4E9E3] bg-[#F7FAF3] px-5 pb-5 pt-5 sm:px-6 ${mobilePresentation ? "pr-12 md:pr-6" : ""}`}>
          <div className="flex items-start gap-3 text-left">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--brand-secondary)]/18 text-[var(--brand-primary)] ring-1 ring-[var(--brand-secondary)]/25 [&_svg]:h-5 [&_svg]:w-5">
              {icon ?? <CircleAlert aria-hidden="true" />}
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-lg font-semibold leading-6 text-[var(--brand-primary)]">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-5 text-[#5F6B62]">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {children ? <div className="px-5 py-4 sm:px-6">{children}</div> : null}

        <DialogFooter className={`border-t border-[#E4E9E3] bg-[#F7FAF3] px-5 py-4 sm:px-6 ${mobilePresentation ? "grid grid-cols-2 gap-3 sm:flex sm:gap-2" : ""}`}>
          <DialogClose asChild>
            <Button
              variant="outline"
              className={`h-11 rounded-lg border border-[var(--brand-primary)]/25 bg-white px-5 text-[var(--brand-primary)] shadow-sm hover:bg-[#EEF4E8] hover:text-[var(--brand-primary)] focus-visible:ring-[var(--brand-secondary)]/35 ${mobilePresentation ? "w-full px-3 sm:w-auto sm:px-5" : ""}`}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
          </DialogClose>

          <Button
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
            className={`h-11 rounded-lg bg-[var(--brand-primary)] px-5 text-white shadow-sm hover:bg-[#153D29] focus-visible:ring-[var(--brand-secondary)]/35 ${mobilePresentation ? "w-full px-3 sm:w-auto sm:px-5" : ""}`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {loadingLabel}
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
