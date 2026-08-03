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
      className="grid min-h-screen bg-[var(--auth-background)] lg:grid-cols-2"
      style={authStyle}
    >
      <LoginImagePanel imageSources={imageSources} />
      <main className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-24">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
