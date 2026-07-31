"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { changeEmail } from "@/lib/api/account";
import { useAuth } from "@/stores/auth";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { formatMessage } from "@/utils/formatters";
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

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentEmail: string;
};

export function ChangeEmailDialog({ open, onOpenChange, currentEmail }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const { logout } = useAuth();

  // validacion de email sencilla
  const emailError = useMemo(() => {
    if (!values.email) return "El email no es valido";
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email);
    return ok ? "" : "El email no es valido";
  }, [values.email]);

  const canSave = useMemo(() => {
    return !submitting && !emailError && values.password.length >= 6;
  }, [submitting, emailError, values.password]);

  const onSubmit = async () => {
    if (!canSave) return;
    setSubmitting(true);
    try {
      await changeEmail({
        email: values.email.trim(),
        password: values.password,
      });
      toast.success("Email actualizado. Se iniciara nuevamente la sesion.");
      onOpenChange(false);
      setTimeout(() => logout(), 1500);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ??
          error.message ??
          "No se pudo actualizar email.";

        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-2xl border-[#DDE5D8] bg-white p-0 shadow-[0_24px_70px_rgba(0,58,34,0.18)] sm:max-w-md">
        <ProfileDialogHeader
          icon={Mail}
          title="Editar email"
          description="Cambia el email personal asociado a tu cuenta."
        />

        <ProfileDialogBody>
          <div className="flex items-start gap-3 rounded-xl border border-[#DDE5D8] bg-[#F7FAF3] p-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#1D4F36] ring-1 ring-[#819B56]/25">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-[#819B56]">
                Email actual
              </p>
              <p className="truncate text-sm font-semibold text-[#1D4F36]">
                {currentEmail}
              </p>
            </div>
          </div>

          <ProfileFormField
            label="Correo electronico nuevo"
            error={emailError ? "El email no es valido" : undefined}
          >
            <Input
              type="email"
              placeholder="Ingresa tu nuevo email"
              value={values.email}
              onChange={(e) =>
                setValues((s) => ({ ...s, email: e.target.value }))
              }
              className={`${profileInputClassName} ${
                emailError
                  ? "border-red-300 bg-red-50/40 focus-visible:border-red-500 focus-visible:ring-red-500/15"
                  : ""
              }`}
            />
          </ProfileFormField>

          <ProfileFormField label="Clave actual">
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Ingresa tu clave actual"
                value={values.password}
                onChange={(e) =>
                  setValues((s) => ({ ...s, password: e.target.value }))
                }
                className={`${profileInputClassName} pr-10`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSubmit();
                }}
              />
              <button
                type="button"
                aria-label={showPw ? "Ocultar clave" : "Mostrar clave"}
                onClick={() => setShowPw((v) => !v)}
                className={profileIconButtonClassName}
                tabIndex={-1}
              >
                {showPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </ProfileFormField>
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
