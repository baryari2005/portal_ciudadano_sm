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
      <div className="rounded-[18px] border border-[#DDE8D7] bg-white/55 p-4">
        <div className="text-sm font-bold text-[#5F6F68]">
          Usuarios exportados
        </div>
        <div className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-[#003A22]">
          <Users className="h-6 w-6 text-[#1D4F36]" />
          {stats.users}
        </div>
      </div>

      <div className="rounded-[18px] border border-[#DDE8D7] bg-white/55 p-4">
        <div className="text-sm font-bold text-[#5F6F68]">
          Legajos exportados
        </div>
        <div className="mt-1 text-2xl font-extrabold text-[#003A22]">
          {stats.legajos}
        </div>
      </div>

      <div className="rounded-[18px] border border-[#DDE8D7] bg-white/55 p-4">
        <div className="text-sm font-bold text-[#5F6F68]">Tiempo</div>
        <div className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-[#003A22]">
          <Timer className="h-6 w-6 text-[#1D4F36]" />
          {(stats.elapsedMs / 1000).toFixed(2)}s
        </div>
      </div>

      {stats.filename && (
        <div className="md:col-span-3 text-sm font-medium text-[#5F6F68]">
          Archivo: <b className="text-[#173C2A]">{stats.filename}</b>
        </div>
      )}
    </div>
  );
}
