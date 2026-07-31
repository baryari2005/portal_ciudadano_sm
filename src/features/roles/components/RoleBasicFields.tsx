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
        <Label className="font-extrabold text-[#173C2A]">Nombre *</Label>
        <Input
          value={nombre}
          className="h-11 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] font-medium text-[#173C2A]"
          onChange={(event) => onNombreChange(event.target.value)}
          placeholder="Ej: Supervisor"
        />
      </div>

      <div className="space-y-1">
        <Label className="font-extrabold text-[#173C2A]">
          Descripcion corta
        </Label>
        <Textarea
          value={descripcion}
          rows={3}
          className="min-h-28 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] font-medium text-[#173C2A]"
          onChange={(event) => onDescripcionChange(event.target.value)}
          placeholder="Ej: Gestioná usuarios y configuracion"
        />
      </div>
    </div>
  );
}
