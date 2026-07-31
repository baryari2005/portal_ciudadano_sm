"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ErrorBannerInput } from "../ErrorBannerInput";
import { useLogin } from "../../hooks/useLogin";
import { AuthDivider } from "./AuthDivider";
import { LoginFields } from "./LoginFields";
import { LoginLogo } from "./LoginLogo";
import { LoginPageLayout } from "./LoginPageLayout";
import { SecureNotice } from "./SecureNotice";
import { getTeacherProfileClient } from "@/features/teacher/services/teacher.service";
import { availableWorkspaces, getDefaultWorkspace, hasTeacherPermissions, WORKSPACE_STORAGE_KEY, workspaceForPath } from "../../libs/workspaces";

type Props = {
  nextParam?: string;
};

export default function LoginForm({ nextParam }: Props) {
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
      const preferred = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      const requestedWorkspace = workspaceForPath(next || "/");
      const destination = availableWorkspaces(user, teacherEnabled).includes(requestedWorkspace) && nextParam ? next : getDefaultWorkspace(user, teacherEnabled, preferred);
      if (!active || lastReplaceRef.current === destination) return;
      lastReplaceRef.current = destination;
      router.replace(destination);
    })();
    return () => { active = false; };
  }, [triedMe, token, user, next, nextParam, router]);

  return (
    <LoginPageLayout>
      <section className="space-y-7">
        <LoginLogo />

        <div className="w-full space-y-2 text-left">
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
            className="group h-[52px] w-full justify-start gap-0 overflow-hidden rounded-lg bg-[var(--auth-primary)] p-0 text-base font-bold text-white shadow-sm hover:bg-[var(--auth-primary)]/95"
            disabled={isSubmitting || netSubmittingRef.current}
          >
            {isSubmitting || netSubmittingRef.current ? (
              <span className="inline-flex w-full items-center justify-center gap-2">
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                {"Ingresando..."}
              </span>
            ) : (
              <>
                <span className="pl-5 text-left">Ingresar</span>
                <span className="ml-auto flex h-full w-16 items-center justify-center bg-[var(--auth-action-accent)] text-[var(--auth-primary)] transition group-hover:bg-[var(--auth-action-accent)]/90">
                  <ArrowRight className="size-6" aria-hidden="true" />
                </span>
              </>
            )}
          </Button>
        </form>

        <AuthDivider />

        <SecureNotice />

        <p className="pt-3 text-center text-sm text-[var(--auth-muted)]">
          ¿No tenés una cuenta?{" "}
          <Link
            href="/request-access"
            className="font-semibold text-[var(--auth-primary)] underline-offset-4 hover:underline"
          >
            Solicitar acceso
          </Link>
        </p>
      </section>
    </LoginPageLayout>
  );
}
