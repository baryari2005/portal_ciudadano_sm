"use client";

import { RequireAuth } from "@/features/auth/components/RequireAuth";

export default function FullBleedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}
