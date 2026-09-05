"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, HelpCircle, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ErrorBannerInput } from "../ErrorBannerInput";
import { useLogin } from "../../hooks/useLogin";
import { AuthDivider } from "./AuthDivider";
import { LoginFields } from "./LoginFields";
import { LoginLogo } from "./LoginLogo";
import { LoginPageLayout } from "./LoginPageLayout";
import { SecureNotice } from "./SecureNotice";
import { getTeacherProfileClient } from "@/features/teacher/services/teacher.service";
import { availableWorkspaces, getDefaultWorkspace, hasTeacherPermissions, workspaceForPath, workspacePreferenceStorageKey } from "../../libs/workspaces";

type Props = {
  nextParam?: string;
  imageSources?: readonly string[];
};

export default function LoginForm({ nextParam, imageSources }: Props) {
  const {
    form,
    onSubmit,
    topError,
    dismissTopError,
    netSubmittingRef,
    triedMe,
    token,
    user,
  } = useLogin();

  const { handleSubmit, formState } = form;
  const { isSubmitting } = formState;
  const router = useRouter();

  const next = useMemo(
    () => (nextParam && nextParam !== "/login" ? nextParam : "/"),
    [nextParam],
  );

  const lastReplaceRef = useRef<string | null>(null);

  useEffect(() => {
    if (!triedMe || !token || !user) {
      return;
    }

    let active = true;
    void (async () => {
      const teacherEnabled = hasTeacherPermissions(user) ? await getTeacherProfileClient().then((profile) => profile.estado === "ACTIVO").catch(() => false) : false;
      const preferred = localStorage.getItem(workspacePreferenceStorageKey(user.id));
      const requestedWorkspace = workspaceForPath(next || "/");
      const destination = availableWorkspaces(user, teacherEnabled).includes(requestedWorkspace) && nextParam ? next : getDefaultWorkspace(user, teacherEnabled, preferred);
      if (!active || lastReplaceRef.current === destination) return;
      lastReplaceRef.current = destination;
      router.replace(destination);
    })();
    return () => { active = false; };
  }, [triedMe, token, user, next, nextParam, router]);

  return (
    <LoginPageLayout imageSources={imageSources}>
      <section className="space-y-6 sm:space-y-7">
        <div className="flex min-h-[125px] flex-col items-center justify-center text-center text-white lg:hidden">
          <LoginLogoMobile />
        </div>

        <div className="relative z-10 pt-5 text-center lg:hidden">
          <h1 className="text-3xl font-extrabold text-[var(--auth-primary)]">
            Ingresá a tu cuenta
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--auth-muted)]">
            Accedé a tus actividades, inscripciones y credencial digital.
          </p>
        </div>

        <div className="space-y-5 rounded-3xl border border-[var(--auth-primary)]/10 bg-white p-5 shadow-[0_16px_45px_rgba(29,79,54,0.13)] sm:p-7 lg:space-y-7 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <LoginLogo />

        <div className="hidden w-full space-y-2 text-left lg:block">
          <h1 className="w-full text-left text-2xl font-extrabold tracking-normal text-[var(--auth-text-primary)] sm:text-[1.7rem]">
            Iniciar sesión
          </h1>
          <p className="max-w-[320px] text-left text-sm leading-5 text-[var(--auth-muted)]">
            Ingresá tus credenciales para acceder al sistema de ayuda y
            actividades.
          </p>
        </div>

        {topError && (
          <ErrorBannerInput message={topError} onClose={dismissTopError} />
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <LoginFields form={form} />

          <div className="-mt-1 flex min-h-5 justify-end">
            <Link
              href="/olvide-password"
              className="text-sm font-semibold text-[var(--auth-primary)] underline underline-offset-2 hover:text-[var(--auth-primary)]/85"
            >
              ¿Olvidó su contraseña?
            </Link>
          </div>

          <Button
            type="submit"
            className="group h-[52px] w-full justify-center gap-0 overflow-hidden rounded-xl bg-[var(--auth-primary)] p-0 text-base font-bold text-white shadow-sm hover:bg-[var(--auth-primary)]/95 lg:justify-start lg:rounded-lg"
            disabled={isSubmitting || netSubmittingRef.current}
          >
            {isSubmitting || netSubmittingRef.current ? (
              <span className="inline-flex w-full items-center justify-center gap-2">
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                {"Ingresando..."}
              </span>
            ) : (
              <>
                <span className="lg:pl-5 lg:text-left">Ingresar</span>
                <span className="ml-auto hidden h-full w-16 items-center justify-center bg-[var(--auth-action-accent)] text-[var(--auth-primary)] transition group-hover:bg-[var(--auth-action-accent)]/90 lg:flex">
                  <ArrowRight className="size-6" aria-hidden="true" />
                </span>
              </>
            )}
          </Button>
        </form>

        <div className="hidden lg:block"><AuthDivider /></div>

        <div className="hidden lg:block"><SecureNotice /></div>

        <p className="text-center text-sm text-[var(--auth-muted)] lg:pt-3">
          <span className="hidden lg:inline">¿No tenés una cuenta?{" "}</span>
          <Link
            href="/request-access"
            className="mt-1 flex h-12 w-full items-center justify-center rounded-xl border border-[var(--auth-primary)] font-bold text-[var(--auth-primary)] transition hover:bg-[var(--auth-primary)]/5 lg:mt-0 lg:inline lg:h-auto lg:w-auto lg:rounded-none lg:border-0 lg:font-semibold lg:underline-offset-4 lg:hover:bg-transparent lg:hover:underline"
          >
            Solicitar acceso
          </Link>
        </p>
        </div>

        <MobileLoginBenefits />
      </section>
    </LoginPageLayout>
  );
}

function LoginLogoMobile() {
  return (
    <div className="text-left drop-shadow-sm">
      <p className="text-xl font-extrabold tracking-wide text-white">MÁS SAN MIGUEL</p>
      <p className="mt-0.5 text-base font-medium text-white/90">Portal ciudadano</p>
    </div>
  );
}

function MobileLoginBenefits() {
  return (
    <div className="space-y-4 pb-2 lg:hidden">
      <section className="overflow-hidden rounded-3xl bg-[var(--brand-panel)] text-[var(--auth-primary)]">
        <div className="grid items-center min-[390px]:grid-cols-[44%_1fr]">
          <div className="flex items-end justify-center self-stretch bg-gradient-to-br from-white/70 to-transparent px-3 pt-4">
            <Image
              src="/mobile/credencial.png"
              alt="Credencial digital mostrada desde un teléfono"
              width={382}
              height={271}
              className="h-auto w-full max-w-[230px] object-contain"
            />
          </div>
          <div className="p-5 min-[390px]:pl-3">
          <h2 className="font-extrabold">Tu credencial digital siempre disponible</h2>
          <p className="mt-1 text-sm leading-5 text-[var(--auth-muted)]">Presentala desde el celular y accedé de forma rápida y segura.</p>
          </div>
        </div>
      </section>
      <div className="flex items-center gap-3 border-y border-[var(--auth-border)]/70 py-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-panel)] text-[var(--auth-primary)]"><ShieldCheck className="size-5" /></span>
        <div><p className="text-sm font-bold text-[var(--auth-text-primary)]">Tus datos están protegidos</p><p className="text-xs text-[var(--auth-muted)]">Usamos una conexión segura para cuidar tu información.</p></div>
      </div>
      <Link href="/request-access" className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-[var(--auth-primary)]">
        <HelpCircle className="size-5" /> ¿Necesitás ayuda para ingresar?
      </Link>
    </div>
  );
}
