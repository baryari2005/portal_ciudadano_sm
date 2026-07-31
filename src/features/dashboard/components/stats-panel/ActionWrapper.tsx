"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Stat } from "./types";

type Props = {
  stat: Stat;
  children: ReactNode;
};

export function ActionWrapper({ stat, children }: Props) {
  const disabled = Boolean(stat.disabled);
  const clickable = !disabled && (Boolean(stat.onClick) || Boolean(stat.href));

  const cursor = disabled
    ? "cursor-not-allowed"
    : clickable
      ? "cursor-pointer"
      : "cursor-default";

  if (stat.onClick && !disabled) {
    return (
      <button
        type="button"
        onClick={stat.onClick}
        className={`block w-full text-left ${cursor}`}
      >
        {children}
      </button>
    );
  }

  if (stat.href && !disabled) {
    return (
      <Link
        href={stat.href}
        className={`block w-full ${cursor}`}
        aria-label={stat.labelTop}
      >
        {children}
      </Link>
    );
  }

  return (
    <div
      className={`block w-full ${cursor}`}
      aria-disabled={disabled || undefined}
    >
      {children}
    </div>
  );
}
