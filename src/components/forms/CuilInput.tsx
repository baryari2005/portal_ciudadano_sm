"use client";

import { forwardRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { formatCuil, normalizeCuil } from "@/lib/cuil";

type Props = React.ComponentProps<typeof Input> & {
  /** Si querés que el onChange reciba el valor "solo dígitos" además del formateado */
  onValueChange?: (digitsOnly: string, formatted: string) => void;
};

export const CuilInput = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, onValueChange, ...rest }, ref) => {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCuil(e.target.value);
        const digits = normalizeCuil(formatted);

        // actualizo el input visible
        e.target.value = formatted;
        onChange?.(e);

        // notifico valor normalizado (si lo quieren guardar sin guiones)
        onValueChange?.(digits, formatted);
      },
      [onChange, onValueChange],
    );

    return (
      <Input
        ref={ref}
        inputMode="numeric"
        autoComplete="off"
        placeholder="##-########-#"
        maxLength={13} // 11 dígitos + 2 guiones
        value={typeof value === "string" ? formatCuil(value) : value}
        onChange={handleChange}
        {...rest}
      />
    );
  },
);
CuilInput.displayName = "CuilInput";
