"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type {
  CategoriaActividad,
  CreateCategoriaActividadInput,
} from "../types/categoria-actividad.types";
import { CategoriaActividadForm } from "./CategoriaActividadForm";

export function CategoriaActividadDialog({
  open,
  item,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  item: CategoriaActividad | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateCategoriaActividadInput) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !loading && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-[var(--brand-primary)]">
            {item ? "Editar categoría" : "Crear categoría"}
          </DialogTitle>
          <DialogDescription>
            {item
              ? "Actualizá la información utilizada para clasificar actividades."
              : "Completá los datos de la nueva categoría de actividades."}
          </DialogDescription>
        </DialogHeader>
        <CategoriaActividadForm
          item={item}
          loading={loading}
          onCancel={onClose}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
