"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ActionWrapper } from "./ActionWrapper";
import { DisabledOverlay } from "./DisabledOverlay";
import { StatIcon } from "./StatIcon";
import { DENSITY } from "./density";
import type { Density, Stat } from "./types";

type Props = {
  stat: Stat;
  density?: Density;
};

export function StatCard({ stat, density = "compact" }: Props) {
  const d = DENSITY[density];
  const disabled = Boolean(stat.disabled);

  return (
    <Card
      key={stat.id}
      aria-disabled={disabled}
      className={`
        relative mb-3 border shadow-sm transition-all duration-300
        ${disabled ? "opacity-60 grayscale" : "hover:shadow-md"}
        ${stat.highlight ? "border-red-500 shadow-lg shadow-red-500/20" : ""}
      `}
    >
      {stat.highlight && (
        <span className="absolute top-2 right-2 h-3 w-3 animate-pulse rounded-full bg-red-500" />
      )}

      {disabled && <DisabledOverlay hint={stat.disabledHint} />}

      <ActionWrapper stat={stat}>
        <CardContent
          title={
            disabled
              ? (stat.disabledHint ?? "Funcionalidad no implementada")
              : undefined
          }
          className={`
            ${d.content}
            flex items-center justify-between
            ${disabled ? "pointer-events-none" : ""}
          `}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 rounded-md bg-white ${d.iconPad}`}>
              <StatIcon name={stat.iconName} />
            </div>

            <div className="min-w-0 leading-tight">
              <div className={`${d.top} font-bold`}>{stat.labelTop}</div>

              <div
                className={`${d.bottom} whitespace-pre-line text-muted-foreground uppercase tracking-wide`}
              >
                {stat.labelBottom}
              </div>
            </div>
          </div>

          <div className="ml-4 shrink-0 text-2xl font-semibold">
            {stat.value}
          </div>
        </CardContent>
      </ActionWrapper>
    </Card>
  );
}
