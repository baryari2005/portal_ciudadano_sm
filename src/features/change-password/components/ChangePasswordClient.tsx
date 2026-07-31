"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { axiosInstance } from "@/lib/axios";
import { isAxiosError } from "axios";
import { Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { Logo } from "@/components/ui/logo";

const MIN_LEN = 6;

export default function ChangePasswordClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const [values, setValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [show, setShow] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);

  const errors = useMemo(() => {
    const e: Record<string, string | undefined> = {};
    if (values.newPassword && values.newPassword.length < MIN_LEN) {
      e.new = `La nueva contraseña debe tener al menos ${MIN_LEN} caracteres.`;
    }
    if (
      values.newPassword &&
      values.currentPassword &&
      values.newPassword === values.currentPassword
    ) {
      e.new = "La nueva contraseña no puede ser igual a la actual.";
    }
    if (values.confirm && values.confirm !== values.newPassword) {
      e.confirm = "Las contraseñas no coinciden.";
    }
    return e;
  }, [values]);

  const canSave = useMemo(() => {
    return (
      values.currentPassword.length > 0 &&
      values.newPassword.length >= MIN_LEN &&
      values.newPassword !== values.currentPassword &&
      values.confirm === values.newPassword &&
      !loading
    );
  }, [values, loading]);

  const submit = async () => {
    if (!canSave) return;
    setLoading(true);
    try {
      await axiosInstance.patch("/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success("Contraseña actualizada.");
      router.replace("/");
    } catch (e: unknown) {
      const msg = isAxiosError(e)
        ? (e.response?.data?.message ?? e.response?.data?.error)
        : undefined;
      toast.error(
        Array.isArray(msg)
          ? msg.join(", ")
          : (msg ?? "No se pudo actualizar la contraseña"),
      );
    } finally {
      setLoading(false);
    }
  };

  const onEnter = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Enter" && canSave) submit();
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[#ebe9fb] p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl p-8 space-y-5">
        <Logo />
        <div className="max-w-md mx-auto p-6 space-y-4">
          {sp.get("first") && (
            <p className="text-sm text-muted-foreground">
              Debés cambiar tu contraseña antes de continuar.
            </p>
          )}

          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            <h1 className="text-base font-semibold">Cambiar contraseña</h1>
          </div>

          {/* Actual */}
          <div className="space-y-1.5">
            <Label className="text-xs">Contraseña actual</Label>
            <div className="relative">
              <Input
                type={show.current ? "text" : "password"}
                placeholder="Contraseña actual"
                value={values.currentPassword}
                onChange={(e) =>
                  setValues((s) => ({ ...s, currentPassword: e.target.value }))
                }
                onKeyDown={onEnter}
                className="pr-10 h-11 rounded"
              />
              <button
                type="button"
                aria-label={
                  show.current ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                onClick={() => setShow((s) => ({ ...s, current: !s.current }))}
                className="absolute inset-y-0 right-2 my-auto h-8 w-8 grid place-items-center rounded hover:bg-muted/60"
                tabIndex={-1}
              >
                {show.current ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Nueva */}
          <div className="space-y-1.5">
            <Label className="text-xs">Nueva contraseña</Label>
            <div className="relative">
              <Input
                type={show.next ? "text" : "password"}
                placeholder="Nueva contraseña"
                value={values.newPassword}
                onChange={(e) =>
                  setValues((s) => ({ ...s, newPassword: e.target.value }))
                }
                onKeyDown={onEnter}
                className="pr-10 h-11 rounded"
              />
              <button
                type="button"
                aria-label={
                  show.next ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                onClick={() => setShow((s) => ({ ...s, next: !s.next }))}
                className="absolute inset-y-0 right-2 my-auto h-8 w-8 grid place-items-center rounded hover:bg-muted/60"
                tabIndex={-1}
              >
                {show.next ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Mínimo {MIN_LEN} caracteres.
            </p>
            {errors.new && (
              <p className="text-[11px] text-red-600">{errors.new}</p>
            )}
          </div>

          {/* Confirmación */}
          <div className="space-y-1.5">
            <Label className="text-xs">Confirmar nueva contraseña</Label>
            <div className="relative">
              <Input
                type={show.confirm ? "text" : "password"}
                placeholder="Repetir nueva contraseña"
                value={values.confirm}
                onChange={(e) =>
                  setValues((s) => ({ ...s, confirm: e.target.value }))
                }
                onKeyDown={onEnter}
                className="pr-10 h-11 rounded"
              />
              <button
                type="button"
                aria-label={
                  show.confirm ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
                className="absolute inset-y-0 right-2 my-auto h-8 w-8 grid place-items-center rounded hover:bg-muted/60 "
                tabIndex={-1}
              >
                {show.confirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirm && (
              <p className="text-[11px] text-red-600">{errors.confirm}</p>
            )}
          </div>

          <div className="pt-2">
            <Button
              onClick={submit}
              disabled={!canSave}
              className="h-11 w-full bg-[#008C93] hover:bg-[#007381] rounded"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  Guardando…
                </span>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
