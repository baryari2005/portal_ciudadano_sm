"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SvgIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

type Props = {
  Icon: SvgIcon;
  href?: string;
  title?: string;
  active?: boolean;
  collapsed?: boolean;
  badgeCount?: number;
  highlight?: boolean;
  onClick?: () => void;
};

export function SidebarNavIcon({
  Icon,
  href,
  title,
  active,
  collapsed,
  badgeCount,
  highlight,
  onClick,
}: Props) {
  const iconSize = collapsed ? 23 : 21;

  const content = (
    <div
      className={`
        relative flex items-center w-full
        ${collapsed ? "justify-center" : "gap-4"}
      `}
    >
      <Icon style={{ width: iconSize, height: iconSize }} strokeWidth={2} />

      {!collapsed && (
        <span className="whitespace-nowrap text-sm font-semibold">{title}</span>
      )}

      {typeof badgeCount === "number" && badgeCount > 0 ? (
        <span
          className={`
            absolute
            ${collapsed ? "-top-1 -right-1" : "right-3"}
            bg-red-600
            text-white
            text-[10px]
            px-1.5
            py-0.5
            rounded-full
            font-semibold
          `}
        >
          {badgeCount}
        </span>
      ) : null}
    </div>
  );

  const button = (
    <Button
      variant="ghost"
      onClick={onClick}
      asChild={!!href}
      className={`
        relative text-white
        transition-all duration-200
        ${
          collapsed
            ? "mx-3 flex h-12 w-12 items-center justify-center rounded-lg px-0"
            : "mx-5 flex h-14 w-[calc(100%-2.5rem)] items-center justify-start rounded-lg px-4"
        }
        ${active ? "bg-[var(--brand-accent)] text-primary shadow-sm hover:bg-[var(--brand-accent)] hover:text-primary" : ""}
        ${
          highlight
            ? "bg-red-500/20 hover:bg-red-500/30"
            : "hover:bg-[var(--brand-accent)] hover:text-primary"
        }
      `}
    >
      {href ? <Link href={href}>{content}</Link> : content}
    </Button>
  );

  if (!collapsed) return button;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="right"
          className="bg-black text-white text-xs px-2 py-1 rounded-md shadow-md"
        >
          {title}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
