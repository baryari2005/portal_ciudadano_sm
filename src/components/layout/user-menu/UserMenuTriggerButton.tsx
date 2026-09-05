"use client";

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "./UserAvatar";
import { cn } from "@/lib/utils";

type Props = {
  avatarUrl?: string;
  fullName?: string;
} & ComponentPropsWithoutRef<typeof Button>;

export const UserMenuTriggerButton = forwardRef<HTMLButtonElement, Props>(
  ({ avatarUrl, fullName, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        aria-label="Abrir menú de usuario"
        className={cn(
          "h-11 w-11 rounded-lg bg-[#e9f3d8] p-0 text-primary hover:bg-[var(--brand-accent)] data-[state=open]:bg-[var(--brand-accent)] focus-visible:ring-0 focus-visible:ring-offset-0 cursor-pointer disabled:cursor-not-allowed",
          className,
        )}
        {...props}
      >
        <UserAvatar
          src={avatarUrl}
          name={fullName}
          className="h-11 w-11 rounded-lg"
          imageClassName="size-full scale-125 object-cover object-center"
          fallbackBgClass="rounded-lg bg-[var(--brand-accent)]"
          textClass="font-bold text-primary"
        />
      </Button>
    );
  },
);

UserMenuTriggerButton.displayName = "UserMenuTriggerButton";
