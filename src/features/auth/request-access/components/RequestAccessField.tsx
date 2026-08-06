"use client";

import type { ComponentProps } from "react";
import type { Control } from "react-hook-form";
import type { LucideIcon } from "lucide-react";

import { DocumentNumberInput } from "@/components/forms/DocumentNumberInput";
import { EmailInput } from "@/components/forms/EmailInput";
import { IconInput } from "@/components/forms/IconInput";
import { PhoneInput } from "@/components/forms/PhoneInput";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import type { RequestAccessFormValues } from "../schemas/requestAccessSchema";

type RequestAccessFieldProps = {
  control: Control<RequestAccessFormValues>;
  name: "nombre" | "apellido" | "dni" | "email" | "telefono" | "fechaNacimiento" | "userId" | "password";
  label: string;
  placeholder: string;
  type: "date" | "email" | "password" | "tel" | "text";
  icon: LucideIcon;
  className?: string;
  autoComplete?: string;
  inputMode?: ComponentProps<typeof Input>["inputMode"];
};

export function RequestAccessField({
  control,
  name,
  label,
  placeholder,
  type,
  icon: Icon,
  className,
  autoComplete,
  inputMode,
}: RequestAccessFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className="font-extrabold text-[var(--brand-ink)]">
            {label}
          </FormLabel>
          <FormControl>
            {name === "email" ? (
              <EmailInput
                id={name}
                value={field.value ?? ""}
                onChange={(value) => field.onChange(value)}
                onBlur={field.onBlur}
                className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 font-medium text-[var(--brand-ink)]"
                placeholder={placeholder}
                required
              />
            ) : name === "telefono" ? (
              <PhoneInput
                id={name}
                value={field.value ?? ""}
                onChange={(value) => field.onChange(value)}
                onBlur={field.onBlur}
                className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 font-medium text-[var(--brand-ink)]"
                placeholder={placeholder}
                required
              />
            ) : name === "dni" ? (
              <DocumentNumberInput
                id={name}
                value={field.value ?? ""}
                onChange={(value) => field.onChange(value)}
                onBlur={field.onBlur}
                className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 font-medium text-[var(--brand-ink)]"
                placeholder={placeholder}
                required
              />
            ) : (
              <IconInput
                id={name}
                leftIcon={<Icon className="h-4 w-4 text-[var(--brand-primary)]" />}
                input={
                  <Input
                    {...field}
                    id={name}
                    type={type}
                    autoComplete={autoComplete}
                    inputMode={inputMode}
                    placeholder={placeholder}
                    className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 font-medium text-[var(--brand-ink)]"
                  />
                }
              />
            )}
          </FormControl>
          <FormMessage className="text-sm" />
        </FormItem>
      )}
    />
  );
}
