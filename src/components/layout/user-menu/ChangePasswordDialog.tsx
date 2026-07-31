// components/account/ChangePasswordDialog.tsx
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { changePassword } from "@/lib/api/account";
import { Eye, EyeOff, KeyRoundIcon, Loader2 } from "lucide-react";
import { formatMessage } from "@/utils/formatters";
import { useAuth } from "@/stores/auth";
import axios from "axios";
import {
  ProfileDialogBody,
  ProfileDialogFooter,
  ProfileDialogHeader,
  ProfileFormField,
  profileIconButtonClassName,
  profileInputClassName,
  profilePrimaryButtonClassName,
  profileSecondaryButtonClassName,
} from "./ProfileDialogParts";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });

  const [show, setShow] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const { logout } = useAuth();

  const canSave = useMemo(() => {
    return (
      values.currentPassword.length > 0 &&
      values.newPassword.length >= 6 &&
      values.newPassword === values.confirm &&
      !submitting
    );
  }, [values, submitting]);

  const onSubmit = async () => {
    if (!canSave) return;

    setSubmitting(true);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      toast.success(
        "Contraseña actualizada. Se iniciara nuevamente la sesión.",
      );
      onOpenChange(false); // 👈 cierra el modal
      setTimeout(() => logout(), 1500);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ??
          error.message ??
          "Error al actualizar la contraseña.";

        toast.error(message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Error al actualizar la contraseña.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-2xl border-[#DDE5D8] bg-white p-0 shadow-[0_24px_70px_rgba(0,58,34,0.18)] sm:max-w-md">
        <ProfileDialogHeader
          icon={KeyRoundIcon}
          title="Editar clave"
          description="Actualiza tu clave de acceso de forma segura."
        />

        <ProfileDialogBody>
          <PasswordField
            label="Clave actual"
            placeholder="Ingresa tu clave actual"
            value={values.currentPassword}
            onChange={(v) => setValues((s) => ({ ...s, currentPassword: v }))}
            visible={show.current}
            onToggleVisible={() =>
              setShow((s) => ({ ...s, current: !s.current }))
            }
          />

          <PasswordField
            label="Nueva clave"
            placeholder="Ingresa tu nueva clave"
            value={values.newPassword}
            onChange={(v) => setValues((s) => ({ ...s, newPassword: v }))}
            visible={show.new}
            onToggleVisible={() => setShow((s) => ({ ...s, new: !s.new }))}
          />

          <PasswordField
            label="Repetir nueva clave"
            placeholder="Repite tu nueva clave"
            value={values.confirm}
            onChange={(v) => setValues((s) => ({ ...s, confirm: v }))}
            visible={show.confirm}
            onToggleVisible={() =>
              setShow((s) => ({ ...s, confirm: !s.confirm }))
            }
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
            onClick={onSubmit}
            disabled={!canSave}
            className={profilePrimaryButtonClassName}
          >
            {submitting ? (
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

/** Campo reutilizable con botón “ojo” a la derecha */
function PasswordField({
  label,
  placeholder,
  value,
  onChange,
  visible,
  onToggleVisible,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <ProfileFormField label={label}>
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${profileInputClassName} pr-10`}
          onKeyDown={(e) => {
            // permitir Enter para enviar
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <button
          type="button"
          aria-label={visible ? "Ocultar clave" : "Mostrar clave"}
          onClick={onToggleVisible}
          className={profileIconButtonClassName}
          tabIndex={-1}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </ProfileFormField>
  );
}
