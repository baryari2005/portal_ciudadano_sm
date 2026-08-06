"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const profileInputClassName =
  "h-11 rounded-lg border-[#D7DED6] bg-white text-[var(--brand-primary)] shadow-sm placeholder:text-[#7C877F] focus-visible:border-[var(--brand-primary)] focus-visible:ring-[var(--brand-secondary)]/25";

export const profileIconButtonClassName =
  "absolute inset-y-0 right-2 my-auto grid h-8 w-8 place-items-center rounded-md text-[var(--brand-primary)]/70 transition-colors hover:bg-[var(--brand-secondary)]/15 hover:text-[var(--brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-secondary)]/35";

export const profilePrimaryButtonClassName =
  "h-11 rounded-lg bg-[var(--brand-primary)] px-5 text-white shadow-sm hover:bg-[#153D29] focus-visible:ring-[var(--brand-secondary)]/35";

export const profileSecondaryButtonClassName =
  "h-11 rounded-lg border border-[var(--brand-primary)]/25 bg-white px-5 text-[var(--brand-primary)] shadow-sm hover:bg-[#EEF4E8] hover:text-[var(--brand-primary)] focus-visible:ring-[var(--brand-secondary)]/35";

type ProfileDialogHeaderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function ProfileDialogHeader({
  icon: Icon,
  title,
  description,
}: ProfileDialogHeaderProps) {
  return (
    <DialogHeader className="border-b border-[#E4E9E3] bg-[#F7FAF3] px-5 pb-5 pt-5 sm:px-6">
      <div className="flex items-start gap-3 text-left">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--brand-secondary)]/18 text-[var(--brand-primary)] ring-1 ring-[var(--brand-secondary)]/25">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <DialogTitle className="text-lg font-semibold leading-6 text-[var(--brand-primary)]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-5 text-[#5F6B62]">
            {description}
          </DialogDescription>
        </div>
      </div>
    </DialogHeader>
  );
}

export function ProfileDialogBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 bg-white px-5 py-5 sm:px-6", className)}>
      {children}
    </div>
  );
}

export function ProfileDialogFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogFooter
      className={cn(
        "border-t border-[#E4E9E3] bg-[#F7FAF3] px-5 py-4 sm:px-6",
        className,
      )}
    >
      {children}
    </DialogFooter>
  );
}

export function ProfileFormField({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--brand-primary)]">{label}</label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
