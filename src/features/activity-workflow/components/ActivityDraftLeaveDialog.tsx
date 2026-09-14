"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function ActivityDraftLeaveDialog({ open, busy, conflict, onSave, onDiscard, onCancel }: {
  open: boolean;
  busy: boolean;
  conflict: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  return <ConfirmDialog
    open={open}
    title="Tenés cambios sin guardar"
    description={conflict ? "El borrador cambió en otra sesión. Podés seguir en esta pantalla o salir descartando únicamente lo que todavía no se guardó." : "Guardá los últimos cambios en el borrador antes de salir, o descartá lo que todavía no se guardó. La actividad publicada no se modifica."}
    confirmLabel="Guardar borrador y salir"
    cancelLabel="Seguir editando"
    loading={busy}
    confirmDisabled={conflict}
    onConfirm={onSave}
    onClose={() => { if (!busy) onCancel(); }}
  >
    <Button variant="outline" disabled={busy} onClick={onDiscard}>Salir sin guardar los últimos cambios</Button>
  </ConfirmDialog>;
}
