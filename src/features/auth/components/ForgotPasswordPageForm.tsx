"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/api/password";

const forgotPasswordPageSchema = z.object({
  email: z.string().email("Ingresá un email válido"),
});

type ForgotPasswordPageValues = z.infer<typeof forgotPasswordPageSchema>;

const GENERIC_MESSAGE =
  "Si el email existe en el sistema, recibirás instrucciones para restablecer tu contraseña.";

export function ForgotPasswordPageForm() {
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordPageValues>({
    resolver: zodResolver(forgotPasswordPageSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordPageValues) {
    await requestPasswordReset({ email: values.email });
    setMessage(GENERIC_MESSAGE);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-[var(--brand-heading)]">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          {...register("email")}
        />
        {errors.email?.message && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="h-11 w-full rounded-md bg-[var(--brand-heading)] hover:bg-[var(--brand-heading)]/90"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Enviando...
          </span>
        ) : (
          "Enviar instrucciones"
        )}
      </Button>

      {message && (
        <p className="rounded-md border border-[var(--brand-secondary)]/30 bg-[var(--brand-secondary)]/10 p-3 text-sm text-[var(--brand-heading)]">
          {message}
        </p>
      )}
    </form>
  );
}
