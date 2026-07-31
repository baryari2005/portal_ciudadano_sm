import type { Stat as BaseStat } from "../../types/types";

export type Stat = BaseStat & {
  disabled?: boolean;
  disabledHint?: string;
};

export type Density = "compact" | "normal";
