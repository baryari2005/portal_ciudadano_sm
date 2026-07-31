"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { axiosInstance } from "@/lib/axios";

type UserStatus = "PENDIENTE" | "ACTIVO" | "RECHAZADO" | "BLOQUEADO";

type UserStatusActionsProps = {
  userId: string;
  status?: UserStatus;
  onChanged?: () => void;
};

async function updateStatus(userId: string, status: UserStatus) {
  await axiosInstance.patch(`/users/${userId}`, { estado: status });
}

export function UserStatusActions({
  userId,
  status = "ACTIVO",
  onChanged,
}: UserStatusActionsProps) {
  async function handleChange(nextStatus: UserStatus) {
    try {
      await updateStatus(userId, nextStatus);
      toast.success("Estado del usuario actualizado.");
      onChanged?.();
    } catch {
      toast.error("No se pudo actualizar el estado del usuario.");
    }
  }

  if (status === "PENDIENTE") {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => handleChange("ACTIVO")}>
          Aprobar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleChange("RECHAZADO")}
        >
          Rechazar
        </Button>
      </div>
    );
  }

  if (status === "BLOQUEADO") {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleChange("ACTIVO")}
      >
        Activar
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => handleChange("BLOQUEADO")}
    >
      Bloquear
    </Button>
  );
}
