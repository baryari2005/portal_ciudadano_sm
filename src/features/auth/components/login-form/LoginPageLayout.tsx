import { type CSSProperties, type ReactNode } from "react";

import { AUTH_COLORS } from "../../constants/auth-theme";
import { LoginImagePanel } from "./LoginImagePanel";

type LoginPageLayoutProps = {
  children: ReactNode;
  imageSources?: readonly string[];
};

export function LoginPageLayout({ children, imageSources }: LoginPageLayoutProps) {
  const authStyle = {
    "--auth-background": AUTH_COLORS.background,
    "--auth-primary": AUTH_COLORS.primary,
    "--auth-text-primary": AUTH_COLORS.textPrimary,
    "--auth-muted": AUTH_COLORS.muted,
    "--auth-border": AUTH_COLORS.border,
    "--auth-white": AUTH_COLORS.white,
    "--auth-action-accent": AUTH_COLORS.actionAccent,
  } as CSSProperties;

  return (
    <div
      className="relative grid min-h-[100dvh] overflow-hidden bg-white lg:bg-[var(--auth-background)] lg:grid-cols-2"
      style={authStyle}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[190px] lg:hidden" aria-hidden="true">
        <svg className="size-full" viewBox="0 0 440 190" preserveAspectRatio="none">
          <defs>
            <linearGradient id="mobile-login-header" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1D4F36" />
              <stop offset="72%" stopColor="#14543A" />
              <stop offset="100%" stopColor="#0B6843" />
            </linearGradient>
          </defs>
          <path d="M0 0H440V154C354 130 300 174 197 170C111 168 48 154 0 135V0Z" fill="url(#mobile-login-header)" />
        </svg>
      </div>
      <div className="pointer-events-none absolute left-[-12px] top-[92px] z-[1] h-16 w-12 rotate-[-22deg] rounded-[80%_15%_80%_15%] bg-[var(--brand-secondary)]/12 lg:hidden" aria-hidden="true" />
      <div className="pointer-events-none absolute left-7 top-[110px] z-[1] h-12 w-8 rotate-[30deg] rounded-[80%_15%_80%_15%] bg-white/[0.045] lg:hidden" aria-hidden="true" />
      <LoginImagePanel imageSources={imageSources} />
      <main className="relative z-10 flex min-h-[100dvh] items-start justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-10 lg:min-h-screen lg:items-center lg:px-16 lg:py-10 xl:px-24">
        <div className="w-full max-w-[440px] lg:max-w-[420px]">
          {children}
        </div>
      </main>
    </div>
  );
}
