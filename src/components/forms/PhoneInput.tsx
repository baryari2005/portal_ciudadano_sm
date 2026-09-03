"use client";

import { Phone } from "lucide-react";

import { IconInput } from "@/components/forms/IconInput";
import { Input } from "@/components/ui/input";
import { cleanPhoneInput, formatPhoneForDisplay } from "@/lib/validation/phone";

type PhoneInputProps = {
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

export function PhoneInput({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  placeholder = "Ej: +54 11 1234-5678",
  className,
  required,
  withIcon = true,
}: PhoneInputProps) {
  const input = (
    <Input
      id={id}
      name={id}
      value={value}
      disabled={disabled}
      required={required}
      inputMode="tel"
      autoComplete="tel"
      className={className}
      placeholder={placeholder}
      onChange={(event) => onChange(cleanPhoneInput(event.target.value))}
      onBlur={() => {
        onChange(formatPhoneForDisplay(value));
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
      leftIcon={<Phone className="h-4 w-4 text-[#1D4F36]" />}
      input={input}
    />
  );
}
