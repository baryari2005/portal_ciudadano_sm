"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils"; // si usás shadcn

type Props = {
  value: string;
  onChange: (val: string) => void;
  roles: Array<{ id: number; nombre: string }>;
  disabled?: boolean;
  triggerClassName?: string; // opcional
};

export function RoleSelect({
  value,
  onChange,
  roles,
  disabled,
  triggerClassName,
}: Props) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "w-full h-11 rounded border px-3 text-sm", // ⬅️ igual que el Input
          triggerClassName,
        )}
      >
        <SelectValue placeholder="Seleccionar rol" />
      </SelectTrigger>
      <SelectContent>
        {roles.map((r) => (
          <SelectItem key={r.id} value={String(r.id)}>
            {r.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
