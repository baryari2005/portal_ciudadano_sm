"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { IconInput } from "@/components/forms/IconInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatMessage } from "@/utils/formatters";

import { forgotPasswordSchema, ForgotPasswordValues } from "../schemas/schemas";
import { requestPasswordReset } from "../services/auth.service";

type ForgotPasswordDialogProps = {
  triggerText?: string;
  triggerClassName?: string;
  onSent?: () => void;
  openControlled?: boolean;
  onOpenChangeControlled?: (open: boolean) => void;
};

export function ForgotPasswordDialog(props: ForgotPasswordDialogProps) {
  const [openUncontrolled, setOpenUncontrolled] = useState(false);
  const emailId = useId();

  const {
    triggerText = "¿Olvidó su contraseña?",
    triggerClassName,
    onSent,
    openControlled,
    onOpenChangeControlled,
  } = props;

  const open = openControlled ?? openUncontrolled;
  const setOpen = onOpenChangeControlled ?? setOpenUncontrolled;

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors, isValid, isDirty },
    reset,
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      await requestPasswordReset(values.email);
      toast.success(
        "Si el email existe, te enviamos un enlace para restablecer la contraseña.",
      );
      reset();
      setOpen(false);
      onSent?.();
    } catch {
      toast.error(
        "No se pudo procesar la solicitud. Intentá nuevamente en unos minutos.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/85",
            triggerClassName,
          )}
        >
          {triggerText}
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1">
            <label htmlFor={emailId} className="text-sm text-muted-foreground">
              Email
            </label>
            <IconInput
              id={emailId}
              leftIcon={<Mail className="h-4 w-4 text-muted-foreground" />}
              input={
                <Input
                  id={emailId}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="tu@correo.com"
                  {...register("email")}
                  aria-invalid={!!errors.email}
                  className="h-11 rounded border pl-9 pr-10"
                />
              }
            />
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded"
            disabled={isSubmitting || !isValid || !isDirty}
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={18} />
                {formatMessage("Enviando...")}
              </span>
            ) : (
              "Enviar enlace"
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            Te enviaremos un enlace si tu email está registrado. Por seguridad,
            el mensaje es el mismo independientemente de si el email existe o
            no.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
