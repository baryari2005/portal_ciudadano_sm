"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";

import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { getDefaultWorkspace } from "@/features/auth/libs/workspaces";
import { useAuth } from "@/stores/auth";

export function WorkspaceAccessDenied() {
  const router = useRouter();
  const user = useAuth((state) => state.user);

  const goHome = () => {
    router.replace(user ? getDefaultWorkspace(user, true) : "/login");
  };

  return (
    <div className="grid h-dvh grid-rows-[116px_minmax(0,1fr)] overflow-hidden bg-[#F7FBF5]">
      <header className="flex items-center justify-between bg-[#1D4F36] px-5 text-white lg:px-8">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <Image
            src="/logoentero.png"
            alt="Más San Miguel"
            width={573}
            height={363}
            priority
            className="h-auto w-24 shrink-0 object-contain brightness-0 invert sm:w-28"
          />
          <div className="min-w-0 border-l border-white/20 pl-4 sm:pl-5">
            <p className="truncate text-lg font-bold sm:text-xl">Acceso restringido</p>
            <p className="mt-1 line-clamp-2 text-xs font-medium text-[#DDEF8F] sm:text-sm">Esta experiencia no está disponible para tu usuario.</p>
          </div>
        </div>
        <UserMenu />
      </header>
      <main className="flex min-h-0 flex-col items-center justify-center overflow-y-auto bg-[var(--brand-page)] p-5 sm:p-8">
        <section className="flex w-full flex-col items-center">
          <div className="relative aspect-[1464/1024] w-[min(86vw,760px)]">
            <Image
              src="/403.png"
              alt="403. Acceso denegado. No tenés permisos para ver esta sección."
              fill
              priority
              sizes="(max-width:768px) 86vw, 760px"
              className="object-contain drop-shadow-[0_22px_35px_rgba(29,79,54,0.08)]"
            />
          </div>
          <Button type="button" className="mt-2 h-11 rounded-xl px-6 font-bold shadow-lg" onClick={goHome}>
            <Home className="size-4" />
            Volver al inicio
          </Button>
        </section>
      </main>
    </div>
  );
}
