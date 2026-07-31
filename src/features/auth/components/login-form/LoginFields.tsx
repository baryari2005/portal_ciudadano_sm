"use client";

import { useState } from "react";
import { type UseFormReturn } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";

import { AuthInput } from "./AuthInput";

export type LoginFormValues = {
  userId: string;
  password: string;
};

type Props = {
  form: UseFormReturn<LoginFormValues>;
};

export function LoginFields({ form }: Props) {
  const [show, setShow] = useState(false);
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <>
      <div className="space-y-1">
        <label htmlFor="userId" className="sr-only">
          Usuario
        </label>
        <AuthInput
          id="userId"
          icon={
            <svg
              className="size-4 fill-current"
              viewBox="0 0 512 512"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M256 256c70.7 0 128-57.3 128-128S326.7 0 256 0 128 57.3 128 128s57.3 128 128 128zm89.6 32h-11.7c-23.6 10.2-49.9 16-77.9 16s-54.3-5.8-77.9-16h-11.7C92.2 288 32 348.2 32 422.4V464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48v-41.6C480 348.2 419.8 288 345.6 288z" />
            </svg>
          }
          autoComplete="username"
          placeholder="Usuario"
          {...register("userId")}
          aria-invalid={!!errors.userId}
          aria-label="Usuario"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="sr-only">
          Contraseña
        </label>
        <AuthInput
          id="password"
          icon={
            <img
              src="/icons/cerrar.svg"
              alt=""
              className="size-4 invert"
              aria-hidden="true"
            />
          }
          type={show ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Contraseña"
          {...register("password")}
          aria-invalid={!!errors.password}
          aria-label="Contraseña"
          rightAdornment={
            <button
              type="button"
              onClick={() => setShow((value) => !value)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--auth-primary)] transition hover:text-[var(--auth-primary)]/80"
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {show ? (
                <EyeOff className="size-5" aria-hidden="true" />
              ) : (
                <Eye className="size-5" aria-hidden="true" />
              )}
            </button>
          }
        />
      </div>
    </>
  );
}
