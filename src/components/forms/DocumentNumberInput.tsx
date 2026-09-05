"use client";

import { IdCard } from "lucide-react";

import { IconInput } from "@/components/forms/IconInput";
import { Input } from "@/components/ui/input";
import { normalizeDocumentNumber } from "@/lib/validation/document";

type DocumentNumberInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
};

export function DocumentNumberInput({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  placeholder = "Ej: 30123456",
  className,
  required,
}: DocumentNumberInputProps) {
  return (
    <IconInput
      id={id}
      leftIcon={<IdCard className="h-4 w-4 text-[var(--brand-primary)]" />}
      input={
        <Input
          id={id}
          name={id}
          value={value}
          disabled={disabled}
          required={required}
          inputMode="numeric"
          autoComplete="off"
          className={className}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(normalizeDocumentNumber(event.target.value))
          }
          onBlur={onBlur}
        />
      }
    />
  );
}
