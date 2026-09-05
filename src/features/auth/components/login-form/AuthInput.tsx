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
      <span className="pointer-events-none absolute inset-y-px left-px flex w-12 items-center justify-center rounded-l-xl text-[var(--auth-primary)] lg:rounded-l-lg lg:bg-[var(--auth-primary)] lg:text-white">
        {icon}
      </span>
      <Input
        className={cn(
          "h-[52px] rounded-xl border-[var(--auth-primary)]/20 bg-white pl-14 pr-4 text-[var(--auth-text-primary)] shadow-none placeholder:text-[var(--auth-muted)] focus-visible:border-[var(--auth-primary)] focus-visible:ring-[var(--auth-primary)]/15 lg:h-12 lg:rounded-lg lg:border-[var(--auth-border)] lg:pl-16 lg:shadow-sm",
          rightAdornment && "pr-12",
          className,
        )}
        {...props}
      />
      {rightAdornment}
    </div>
  );
}
