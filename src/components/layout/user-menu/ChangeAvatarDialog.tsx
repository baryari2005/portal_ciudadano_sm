"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AvatarUploader } from "@/features/settings/components/AvatarUploader";
import { useAvatarStaging } from "@/features/users/hooks/useAvatarStaging";
import { pathFromPublicUrl } from "@/features/users/lib/utils";
import { useAuth } from "@/stores/auth"; // donde tengas user + logout
import { FileImage, Loader2 } from "lucide-react";
import { formatMessage } from "@/utils/formatters";
import { changeMyAvatar } from "@/lib/api/account";
import axios from "axios";
import {
  ProfileDialogBody,
  ProfileDialogFooter,
  ProfileDialogHeader,
  profilePrimaryButtonClassName,
  profileSecondaryButtonClassName,
} from "./ProfileDialogParts";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function ChangeAvatarDialog({ open, onOpenChange }: Props) {
  const { user, logout } = useAuth(); // tu usuario logueado
  const { tmpPath, setTmpPath, commit } = useAvatarStaging();
  const oldKey = pathFromPublicUrl(user?.avatarUrl); // ej: users/<id>.jpg
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setTmpPath(null);
  }, [open, setTmpPath]);

  const onSave = async () => {
    if (!tmpPath) {
      toast.error("Selecciona una imagen primero");
      return;
    }
    try {
      setSaving(true);
      // mueve de avatars/tmp/... a avatars/users/<id>.<ext> y devuelve { key, publicUrl }
      const r = await commit(`users/${user!.id}`, oldKey);

      await changeMyAvatar({ avatarUrl: r.publicUrl });
      // guarda en tu usuario logueado
      //await axiosInstance.post("/auth/change-avatar", { avatarUrl: r.publicUrl });

      toast.success("Avatar actualizado. Vuelve a iniciar sesion.");
      onOpenChange(false);
      onOpenChange(false); // cierra el modal
      setTimeout(() => logout(), 1500);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ??
          error.message ??
          "No se pudo actualizar el avatar";

        toast.error(message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("No se pudo actualizar el avatar");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-2xl border-[#DDE5D8] bg-white p-0 shadow-[0_24px_70px_rgba(0,58,34,0.18)] sm:max-w-md">
        <ProfileDialogHeader
          icon={FileImage}
          title="Cambiar avatar"
          description="Actualiza la imagen visible en tu perfil del dashboard."
        />

        <ProfileDialogBody>
          <AvatarUploader
            currentUrl={user?.avatarUrl}
            onTempUploaded={({ tmpPath }) => setTmpPath(tmpPath)} // guardamos el tmp
          />
        </ProfileDialogBody>

        <ProfileDialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              className={profileSecondaryButtonClassName}
            >
              Cancelar
            </Button>
          </DialogClose>
          <Button
            onClick={onSave}
            disabled={saving || !tmpPath}
            className={profilePrimaryButtonClassName}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={18} />
                {formatMessage("Guardando...")}
              </span>
            ) : (
              "Guardar"
            )}
          </Button>
        </ProfileDialogFooter>
      </DialogContent>
    </Dialog>
  );
}
