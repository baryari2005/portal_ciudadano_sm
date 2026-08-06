"use client";

import { Mail } from "lucide-react";

import { IconInput } from "@/components/forms/IconInput";
import { Input } from "@/components/ui/input";
import { normalizeEmail } from "@/lib/validation/email";

type EmailInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
  withIcon?: boolean;
};

export function EmailInput({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  placeholder = "Ej: usuario@mail.com",
  className,
  required,
  withIcon = true,
}: EmailInputProps) {
  const input = (
    <Input
      id={id}
      name={id}
      type="email"
      value={value}
      disabled={disabled}
      required={required}
      inputMode="email"
      autoComplete="email"
      className={className}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => {
        onChange(normalizeEmail(value));
        onBlur?.();
      }}
    />
  );

  if (!withIcon) {
    return input;
  }

  return (
    <IconInput
      id={id}
      leftIcon={<Mail className="h-4 w-4 text-[var(--brand-primary)]" />}
      input={input}
    />
  );
}
