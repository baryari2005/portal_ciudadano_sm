"use client";

import { useEffect, useState } from "react";
import { verifyResetToken } from "@/lib/api/password";
import { ResetPasswordForm } from "./ResetPasswordForm";

type Props = { token: string };

export function ResetPasswordGate({ token }: Props) {
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) {
        if (alive) setValid(false);
        return;
      }
      try {
        const r = await verifyResetToken(token);
        if (alive) setValid(!!r.valid);
      } catch {
        if (alive) setValid(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  if (!token) return <div className="p-6">Falta token.</div>;
  if (valid === null) return <div className="p-6">Verificando enlace…</div>;
  if (!valid) return <div className="p-6">Enlace inválido o vencido.</div>;

  return (
    <div className="max-w-sm mx-auto p-6">
      <h1 className="text-lg font-semibold mb-4">Restablecer contraseña</h1>
      <ResetPasswordForm token={token} />
    </div>
  );
}
