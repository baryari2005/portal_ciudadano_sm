"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { ManagedUser } from "../../types/management.types";
import { buildAccessQrPayload } from "./UserAccessQrCard";

type UserAccessCardDialogProps = {
  user: ManagedUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function buildPrintDocument(user: ManagedUser, qrDataUrl: string) {
  const avatarMarkup = user.avatarUrl
    ? `<img src="${user.avatarUrl}" alt="${user.fullName}" class="avatar" />`
    : `<div class="avatar fallback">${user.initials}</div>`;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Carnet de ingreso - ${user.fullName}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: var(--brand-page);
        font-family: Arial, sans-serif;
        color: var(--brand-heading);
      }
      .card {
        width: 340px;
        border: 1px solid var(--brand-border);
        border-radius: 18px;
        overflow: hidden;
        background: #ffffff;
        box-shadow: 0 18px 45px rgba(0, 58, 34, 0.14);
      }
      .header {
        background: var(--brand-primary);
        color: #ffffff;
        padding: 18px 20px;
      }
      .brand {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0;
      }
      .subtitle {
        color: var(--brand-accent);
        font-size: 12px;
        font-weight: 700;
        margin-top: 4px;
      }
      .content {
        padding: 20px;
      }
      .person {
        display: flex;
        gap: 14px;
        align-items: center;
      }
      .avatar {
        width: 82px;
        height: 82px;
        border-radius: 16px;
        object-fit: cover;
        background: #dfeed2;
      }
      .fallback {
        display: grid;
        place-items: center;
        background: var(--brand-primary-strong);
        color: #ffffff;
        font-size: 26px;
        font-weight: 800;
      }
      .name {
        font-size: 20px;
        font-weight: 800;
        line-height: 1.15;
      }
      .meta {
        margin-top: 5px;
        color: var(--brand-text);
        font-size: 13px;
        font-weight: 700;
      }
      .qr {
        margin-top: 22px;
        display: grid;
        place-items: center;
        border: 1px solid var(--brand-border-soft);
        border-radius: 14px;
        padding: 14px;
        background: var(--brand-page);
      }
      .qr img {
        width: 170px;
        height: 170px;
      }
      .foot {
        margin-top: 12px;
        color: var(--brand-muted);
        font-size: 11px;
        font-weight: 700;
        text-align: center;
      }
      @media print {
        body { background: #ffffff; }
        .card { box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <article class="card">
      <header class="header">
        <div class="brand">MÁS San Miguel</div>
        <div class="subtitle">Carnet de ingreso</div>
      </header>
      <section class="content">
        <div class="person">
          ${avatarMarkup}
          <div>
            <div class="name">${user.fullName}</div>
            <div class="meta">Usuario: ${user.userId}</div>
            <div class="meta">DNI: ${user.dni}</div>
          </div>
        </div>
        <div class="qr">
          <img src="${qrDataUrl}" alt="QR de ingreso" />
        </div>
        <div class="foot">Credencial generada por el Portal ciudadano</div>
      </section>
    </article>
    <script>
      window.addEventListener("load", () => {
        window.print();
      });
    </script>
  </body>
</html>`;
}

export function UserAccessCardDialog({
  user,
  open,
  onOpenChange,
}: UserAccessCardDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const qrPayload = useMemo(
    () => (user ? buildAccessQrPayload(user) : ""),
    [user],
  );

  useEffect(() => {
    let active = true;

    if (!open || !qrPayload) {
      setQrDataUrl("");
      return;
    }

    QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 220,
      color: {
        dark: "var(--brand-heading)",
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
  }, [open, qrPayload]);

  function printCard() {
    if (!user || !qrDataUrl) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=480,height=720");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintDocument(user, qrDataUrl));
    printWindow.document.close();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Carnet de ingreso</DialogTitle>
          <DialogDescription>
            El usuario fue aprobado. Podés imprimir su carnet con QR.
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <div className="overflow-hidden rounded-[18px] border border-[var(--brand-border)] bg-white">
            <div className="bg-[var(--brand-primary)] px-5 py-4 text-white">
              <p className="text-xl font-extrabold">MÁS San Miguel</p>
              <p className="text-sm font-bold text-[var(--brand-accent)]">
                Carnet de ingreso
              </p>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 rounded-2xl border border-[var(--brand-border-soft)]">
                  <AvatarImage
                    src={user.avatarUrl ?? undefined}
                    alt={user.fullName}
                  />
                  <AvatarFallback className="rounded-2xl bg-[var(--brand-primary-strong)] text-xl font-extrabold text-white">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-xl font-extrabold text-[var(--brand-heading)]">
                    {user.fullName}
                  </p>
                  <p className="text-sm font-bold text-[var(--brand-text)]">
                    Usuario: {user.userId}
                  </p>
                  <p className="text-sm font-bold text-[var(--brand-text)]">
                    DNI: {user.dni}
                  </p>
                </div>
              </div>

              <div className="grid place-items-center rounded-2xl border border-[var(--brand-border-soft)] bg-[var(--brand-page)] p-4">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="QR de ingreso"
                    className="h-44 w-44"
                  />
                ) : (
                  <div className="grid h-44 w-44 place-items-center text-sm font-bold text-[var(--brand-muted)]">
                    Generando QR...
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-[var(--brand-border)] font-bold text-[var(--brand-ink)]"
            disabled={!qrDataUrl}
            onClick={() => user && navigator.clipboard?.writeText(qrPayload)}
          >
            <Download className="size-4" aria-hidden="true" />
            Copiar dato
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-[var(--brand-heading)] font-bold text-white hover:bg-[var(--brand-primary)]"
            disabled={!qrDataUrl}
            onClick={printCard}
          >
            <Printer className="size-4" aria-hidden="true" />
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
