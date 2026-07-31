"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { axiosInstance } from "@/lib/axios";
import type { PermisosGrupo, RoleUpdate } from "../types/types";
import { useAuth } from "@/stores/auth";
import { toast } from "sonner";

type UseEditRoleParams = {
  enabled: boolean;
};

export function useEditRole({ enabled }: UseEditRoleParams) {
  const params = useParams();
  const router = useRouter();

  const fetchMe = useAuth((state) => state.fetchMe);

  const rawId = params?.id;
  const id = useMemo(
    () => (Array.isArray(rawId) ? rawId[0] : rawId)?.toString() ?? "",
    [rawId],
  );

  const [role, setRole] = useState<RoleUpdate | null>(null);
  const [permisos, setPermisos] = useState<PermisosGrupo[]>([]);
  const [selectedPermisos, setSelectedPermisos] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    if (!enabled || !id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [roleRes, permisosRes] = await Promise.all([
          axiosInstance.get(`/roles/${id}`),
          axiosInstance.get("/permissions", {
            params: { grouped: true },
          }),
        ]);

        const roleData = roleRes.data.data;
        const permisosData = permisosRes.data.data;

        setRole(roleData);
        setPermisos(permisosData);

        setNombre(roleData.nombre ?? "");
        setDescripcion(roleData.descripcion ?? "");
        setActivo(Boolean(roleData.activo));

        const assignedIds = roleData.permisos.map(
          (rp: { permiso: { id: number } }) => rp.permiso.id,
        );

        setSelectedPermisos(assignedIds);
      } catch (error) {
        console.error("Error cargando rol:", error);
        setRole(null);
        setPermisos([]);
        setSelectedPermisos([]);
        setError("No pudimos cargar el rol y los permisos disponibles.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enabled, id, reloadKey]);

  const togglePermiso = (permisoId: number) => {
    setSelectedPermisos((prev) =>
      prev.includes(permisoId)
        ? prev.filter((id) => id !== permisoId)
        : [...prev, permisoId],
    );
  };

  const toggleAllPermisos = () => {
    const allIds = permisos.flatMap((group) =>
      group.permisos.map((permission) => permission.id),
    );
    const allSelected =
      allIds.length > 0 &&
      allIds.every((permissionId) => selectedPermisos.includes(permissionId));
    setSelectedPermisos(allSelected ? [] : allIds);
  };

  const handleCancel = () => {
    router.push("/roles");
  };

  const handleSave = async () => {
    if (!id) return;

    setSaving(true);

    try {
      await axiosInstance.put(`/roles/${id}`, {
        nombre,
        descripcion: descripcion || null,
        activo,
      });

      await axiosInstance.put(`/roles/${id}/permisos`, {
        permisoIds: selectedPermisos,
      });

      await fetchMe(true);

      toast.success(
        "Rol actualizado. Se refrescaron los permisos de la sesión actual.",
      );

      window.location.assign("/roles");
    } catch (error) {
      console.error("Error guardando rol:", error);
      toast.error("No se pudo guardar el rol.");
    } finally {
      setSaving(false);
    }
  };

  return {
    id,
    role,
    permisos,
    selectedPermisos,
    loading,
    saving,
    error,
    nombre,
    descripcion,
    activo,
    setNombre,
    setDescripcion,
    setActivo,
    togglePermiso,
    toggleAllPermisos,
    handleSave,
    handleCancel,
    retry: () => setReloadKey((current) => current + 1),
  };
}
