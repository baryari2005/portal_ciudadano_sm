"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils/initials";

type Props = {
  src?: string;
  name?: string;
  className?: string;
  imageClassName?: string;
  fallbackBgClass?: string;
  textClass?: string;
};

export function UserAvatar({
  src,
  name,
  className,
  imageClassName,
  fallbackBgClass = "bg-primary",
  textClass = "text-white",
}: Props) {
  const display = initials(name);

  return (
    <Avatar className={cn("h-10 w-10", className)}>
      <AvatarImage src={src} alt={name ?? "Avatar"} className={imageClassName} />
      <AvatarFallback className={cn(fallbackBgClass, textClass)}>
        {display}
      </AvatarFallback>
    </Avatar>
  );
}
