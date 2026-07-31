"use client";

import { type ComponentProps, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthInputProps = ComponentProps<"input"> & {
  icon: ReactNode;
  rightAdornment?: ReactNode;
};

export function AuthInput({
  icon,
  rightAdornment,
  className,
  ...props
}: AuthInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-px left-px flex w-12 items-center justify-center rounded-l-lg bg-[var(--auth-primary)] text-white">
        {icon}
      </span>
      <Input
        className={cn(
          "h-12 rounded-lg border-[var(--auth-border)] bg-white pl-16 pr-4 text-[var(--auth-text-primary)] shadow-sm placeholder:text-[var(--auth-muted)] focus-visible:border-[var(--auth-primary)] focus-visible:ring-[var(--auth-primary)]/15",
          rightAdornment && "pr-12",
          className,
        )}
        {...props}
      />
      {rightAdornment}
    </div>
  );
}
