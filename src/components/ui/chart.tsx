"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<string, { label?: React.ReactNode; color?: string }>;

const ChartContext = React.createContext<ChartConfig>({});

export function ChartContainer({ config, className, children, ...props }: React.ComponentProps<"div"> & { config: ChartConfig; children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"] }) {
  return <ChartContext.Provider value={config}>
    <div data-slot="chart" className={cn("flex aspect-video justify-center text-xs", className)} {...props}>
      <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
    </div>
  </ChartContext.Provider>;
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

type ChartTooltipEntry = { color?: string; dataKey?: string | number; name?: string | number; value?: string | number };

type ChartTooltipContentProps = React.ComponentProps<"div"> & {
  active?: boolean;
  payload?: readonly ChartTooltipEntry[];
  label?: React.ReactNode;
  labelFormatter?: (label: React.ReactNode, payload: readonly ChartTooltipEntry[]) => React.ReactNode;
};

export function ChartTooltipContent({ active, payload, label, labelFormatter, className }: ChartTooltipContentProps) {
  const config = React.useContext(ChartContext);
  if (!active || !payload?.length) return null;
  const formattedLabel = labelFormatter ? labelFormatter(label, payload) : label;
  return <div className={cn("grid min-w-36 gap-1.5 rounded-xl border border-[var(--brand-border)] bg-white px-3 py-2 text-xs shadow-lg", className)}>
    <p className="font-bold text-[var(--brand-muted)]">{formattedLabel}</p>
    {payload.map((item) => {
      const key = String(item.dataKey ?? item.name ?? "value");
      return <div key={key} className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 font-medium text-[var(--brand-text)]"><span className="size-2.5 rounded-sm" style={{ backgroundColor: item.color ?? config[key]?.color }} />{config[key]?.label ?? item.name}</span>
        <strong className="font-mono text-[var(--brand-primary)]">{Number(item.value ?? 0).toLocaleString("es-AR")}</strong>
      </div>;
    })}
  </div>;
}
