"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type {
  CreatePublicoObjetivoInput,
  PublicoObjetivo,
} from "../types/publico-objetivo.types";
import { PublicoObjetivoForm } from "./PublicoObjetivoForm";

export function PublicoObjetivoDialog({
  open,
  item,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  item: PublicoObjetivo | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: CreatePublicoObjetivoInput) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !loading && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-[var(--brand-primary)]">
            {item ? "Editar público objetivo" : "Crear público objetivo"}
          </DialogTitle>
          <DialogDescription>
            {item
              ? "Actualizá la referencia utilizada para clasificar actividades."
              : "Completá los datos del nuevo público objetivo."}
          </DialogDescription>
        </DialogHeader>
        <PublicoObjetivoForm
          item={item}
          loading={loading}
          onCancel={onClose}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
