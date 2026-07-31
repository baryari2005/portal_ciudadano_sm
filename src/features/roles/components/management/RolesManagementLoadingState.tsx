import { Loader2 } from "lucide-react";

export function RolesManagementLoadingState() {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="flex h-[calc(100dvh-var(--topbar-h)-48px)] w-full items-center justify-center bg-[#F7FBF5] p-8"
    >
      <div className="flex items-center gap-4 rounded-[18px] border border-[#DDE8D7] bg-[#EEF6E9] px-6 py-5 text-[#173C2A] shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DDEED2]">
          <Loader2 className="h-6 w-6 animate-spin text-[#00522C]" />
        </div>
        <div>
          <p className="text-base font-extrabold text-[#003A22]">
            Cargando roles
          </p>
          <p className="text-sm font-medium text-[#5F6F68]">
            Estamos preparando roles, permisos y usuarios asociados.
          </p>
        </div>
      </div>
    </section>
  );
}
