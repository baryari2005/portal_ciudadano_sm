"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/stores/auth";

import {
  completeProfileSchema,
  CompleteProfileValues,
} from "../schemas/complete-profile.schema";
import { completeProfile } from "../services/profile.service";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

export function CompleteProfileForm() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const token = useAuth((state) => state.token);
  const triedMe = useAuth((state) => state.triedMe);
  const fetchMe = useAuth((state) => state.fetchMe);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CompleteProfileValues>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      documento: "",
      domicilio: "",
      celular: "",
      fechaNacimiento: "",
    },
  });

  useEffect(() => {
    if (!token && triedMe) {
      router.replace("/login?next=/completar-perfil");
    }
  }, [router, token, triedMe]);

  useEffect(() => {
    if (!user) {
      return;
    }

    reset({
      nombre: user.nombre ?? "",
      apellido: user.apellido ?? "",
      documento: "",
      domicilio: "",
      celular: "",
      fechaNacimiento: "",
    });
  }, [reset, user]);

  async function onSubmit(values: CompleteProfileValues) {
    try {
      const result = await completeProfile(values);
      await fetchMe(true);
      toast.success("Tu perfil fue completado correctamente.");
      router.replace(result.redirectTo ?? "/cuenta-pendiente");
    } catch {
      toast.error("No se pudo completar el perfil. Revisá los datos.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            className="text-sm font-medium text-[var(--brand-heading)]"
            htmlFor="nombre"
          >
            Nombre
          </label>
          <Input id="nombre" {...register("nombre")} />
          <FieldError message={errors.nombre?.message} />
        </div>

        <div className="space-y-1">
          <label
            className="text-sm font-medium text-[var(--brand-heading)]"
            htmlFor="apellido"
          >
            Apellido
          </label>
          <Input id="apellido" {...register("apellido")} />
          <FieldError message={errors.apellido?.message} />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-[var(--brand-heading)]" htmlFor="email">
          Email
        </label>
        <Input id="email" value={user?.email ?? ""} disabled readOnly />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            className="text-sm font-medium text-[var(--brand-heading)]"
            htmlFor="documento"
          >
            DNI
          </label>
          <Input id="documento" {...register("documento")} />
          <FieldError message={errors.documento?.message} />
        </div>

        <div className="space-y-1">
          <label
            className="text-sm font-medium text-[var(--brand-heading)]"
            htmlFor="fechaNacimiento"
          >
            Fecha de nacimiento
          </label>
          <Input
            id="fechaNacimiento"
            type="date"
            {...register("fechaNacimiento")}
          />
          <FieldError message={errors.fechaNacimiento?.message} />
        </div>
      </div>

      <div className="space-y-1">
        <label
          className="text-sm font-medium text-[var(--brand-heading)]"
          htmlFor="domicilio"
        >
          Dirección
        </label>
        <Input id="domicilio" {...register("domicilio")} />
        <FieldError message={errors.domicilio?.message} />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-[var(--brand-heading)]" htmlFor="celular">
          Teléfono
        </label>
        <Input id="celular" {...register("celular")} />
        <FieldError message={errors.celular?.message} />
      </div>

      <Button
        type="submit"
        className="h-11 w-full rounded-md bg-[var(--brand-heading)] hover:bg-[var(--brand-heading)]/90"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Guardando...
          </span>
        ) : (
          "Completar perfil"
        )}
      </Button>
    </form>
  );
}
