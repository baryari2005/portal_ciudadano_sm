import type { Density } from "./types";

export const DENSITY: Record<
  Density,
  {
    content: string;
    iconPad: string;
    top: string;
    bottom: string;
  }
> = {
  compact: {
    content: "px-3 py-2 h-16",
    iconPad: "p-1.5",
    top: "text-[18px]",
    bottom: "text-[13px]",
  },
  normal: {
    content: "p-4",
    iconPad: "p-2",
    top: "text-sm",
    bottom: "text-xs",
  },
};
