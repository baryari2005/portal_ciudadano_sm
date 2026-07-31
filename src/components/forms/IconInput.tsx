"use client";

import { ReactNode } from "react";

export function IconInput({
  leftIcon,
  rightAdornment,
  input,
}: {
  id: string;
  leftIcon: ReactNode;
  rightAdornment?: ReactNode;
  input: ReactNode;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        {leftIcon}
      </span>
      {input}
      {rightAdornment}
    </div>
  );
}
