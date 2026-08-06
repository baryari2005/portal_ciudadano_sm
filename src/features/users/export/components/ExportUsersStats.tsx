import { Timer, Users } from "lucide-react";
import { ExportUsersStats as ExportUsersStatsType } from "../types/export-users.types";

type Props = {
  stats: ExportUsersStatsType | null;
};

export function ExportUsersStats({ stats }: Props) {
  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="rounded-[18px] border border-[var(--brand-border-soft)] bg-white/55 p-4">
        <div className="text-sm font-bold text-[var(--brand-muted)]">
          Usuarios exportados
        </div>
        <div className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-[var(--brand-heading)]">
          <Users className="h-6 w-6 text-[var(--brand-primary)]" />
          {stats.users}
        </div>
      </div>

      <div className="rounded-[18px] border border-[var(--brand-border-soft)] bg-white/55 p-4">
        <div className="text-sm font-bold text-[var(--brand-muted)]">
          Legajos exportados
        </div>
        <div className="mt-1 text-2xl font-extrabold text-[var(--brand-heading)]">
          {stats.legajos}
        </div>
      </div>

      <div className="rounded-[18px] border border-[var(--brand-border-soft)] bg-white/55 p-4">
        <div className="text-sm font-bold text-[var(--brand-muted)]">Tiempo</div>
        <div className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-[var(--brand-heading)]">
          <Timer className="h-6 w-6 text-[var(--brand-primary)]" />
          {(stats.elapsedMs / 1000).toFixed(2)}s
        </div>
      </div>

      {stats.filename && (
        <div className="md:col-span-3 text-sm font-medium text-[var(--brand-muted)]">
          Archivo: <b className="text-[var(--brand-ink)]">{stats.filename}</b>
        </div>
      )}
    </div>
  );
}
