"use client";

import { axiosInstance } from "@/lib/axios";
import { useAuth } from "@/stores/auth";
import { useState } from "react";

export function useAvatarStaging() {
  const [tmpPath, setTmpPath] = useState<string | null>(null);
  const { token } = useAuth();

  // Este lo debería usar tu <AvatarUploader /> para subir temporal
  async function uploadTemp(file: File) {
    const fd = new FormData();
    fd.append("file", file);

    // Endpoint de subida temporal (ajustá si ya tenés otro)
    const res = await fetch("/api/uploads/avatar/tmp", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data?.error || "Error subiendo avatar temporal");
    setTmpPath(data.path); // ej: "avatars/tmp/abcd.png"
    return data; // { path, url? }
  }

  // Mueve de tmp -> finalPrefix y borra la tmp. Devuelve publicUrl.
  async function commit(finalPrefix: string, oldPath?: string | null) {
    if (!tmpPath) throw new Error("No hay tmpPath para commitear.");
    const { data } = await axiosInstance.post(
      "/uploads/avatar/commit",
      { tmpPath, finalPrefix, oldPath: oldPath ?? null },
      {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      },
    );
    setTmpPath(null);
    return data as { publicUrl: string; path: string };
  }

  return { tmpPath, setTmpPath, uploadTemp, commit };
}
