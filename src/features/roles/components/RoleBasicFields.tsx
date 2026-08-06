"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  nombre: string;
  descripcion: string;
  onNombreChange: (value: string) => void;
  onDescripcionChange: (value: string) => void;
};

export function RoleBasicFields({
  nombre,
  descripcion,
  onNombreChange,
  onDescripcionChange,
}: Props) {
  return (
    <div className="grid gap-6">
      <div className="space-y-1">
        <Label className="font-extrabold text-[var(--brand-ink)]">Nombre *</Label>
        <Input
          value={nombre}
          className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-medium text-[var(--brand-ink)]"
          onChange={(event) => onNombreChange(event.target.value)}
          placeholder="Ej: Supervisor"
        />
      </div>

      <div className="space-y-1">
        <Label className="font-extrabold text-[var(--brand-ink)]">
          Descripcion corta
        </Label>
        <Textarea
          value={descripcion}
          rows={3}
          className="min-h-28 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-medium text-[var(--brand-ink)]"
          onChange={(event) => onDescripcionChange(event.target.value)}
          placeholder="Ej: Gestioná usuarios y configuracion"
        />
      </div>
    </div>
  );
}
