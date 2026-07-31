"use client";

import { StatCard } from "./StatCard";
import type { Density, Stat } from "./types";

type Props = {
  stats: Stat[];
  density?: Density;
};

export function StatsPanel({ stats, density = "compact" }: Props) {
  return (
    <div className="grid gap-3">
      {stats.map((stat) => (
        <StatCard key={stat.id} stat={stat} density={density} />
      ))}
    </div>
  );
}
