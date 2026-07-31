"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { ManagedUser } from "../../types/management.types";

type UserAccessQrCardProps = {
  user: ManagedUser;
  compact?: boolean;
};

export function buildAccessQrPayload(user: ManagedUser) {
  return JSON.stringify({
    type: "MASM_ACCESS_CARD",
    userId: user.id,
    username: user.userId,
    dni: user.dni,
  });
}

export function UserAccessQrCard({ user, compact }: UserAccessQrCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const qrPayload = useMemo(() => buildAccessQrPayload(user), [user]);

  useEffect(() => {
    let active = true;

    QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: compact ? 180 : 220,
      color: {
        dark: "#003A22",
        light: "#FFFFFF",
      },
    }).then((dataUrl) => {
      if (active) {
        setQrDataUrl(dataUrl);
      }
    });

    return () => {
      active = false;
    };
  }, [compact, qrPayload]);

  function printQr() {
    window.print();
  }

  return (
    <div className="rounded-[18px] border border-[#C9D9C3] bg-white/55 p-5 text-center">
      <p className="text-sm font-extrabold uppercase tracking-normal text-[#003A22]">
        QR de ingreso
      </p>
      <p className="mt-1 text-xs font-medium text-[#5F6F68]">
        Credencial del usuario activo
      </p>

      <div className="mt-4 grid place-items-center rounded-2xl border border-[#DDE8D7] bg-[#F7FBF5] p-3">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt={`QR de ingreso de ${user.fullName}`}
            className={compact ? "h-36 w-36" : "h-44 w-44"}
          />
        ) : (
          <div
            className={
              compact
                ? "grid h-36 w-36 place-items-center text-xs font-bold text-[#5F6F68]"
                : "grid h-44 w-44 place-items-center text-sm font-bold text-[#5F6F68]"
            }
          >
            Generando QR...
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-4 h-10 w-full rounded-xl border-[#C9D9C3] bg-white/70 font-bold text-[#173C2A] hover:bg-white"
        disabled={!qrDataUrl}
        onClick={printQr}
      >
        <Printer className="size-4" aria-hidden="true" />
        Imprimir
      </Button>
    </div>
  );
}
