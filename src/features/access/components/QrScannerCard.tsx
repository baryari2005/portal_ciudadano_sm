"use client";

import {
  AlertCircle,
  Camera,
  Loader2,
  QrCode,
  Search,
  Square,
} from "lucide-react";
import Link from "next/link";
import type { RefObject } from "react";

import { Button } from "@/components/ui/button";

import type { QrScannerStatus } from "../types/access.types";
import { QrInvalidState } from "./QrInvalidState";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  status: QrScannerStatus;
  scanning: boolean;
  onStart: () => void;
  onStop: () => void;
};

const statusContent: Record<
  QrScannerStatus,
  { title: string; detail: string }
> = {
  idle: {
    title: "Esperando escaneo",
    detail: "Inicia el scanner cuando la persona tenga su QR listo.",
  },
  scanning: {
    title: "Escaneando QR...",
    detail: "Acerca el codigo QR al marco central de la camara.",
  },
  read: {
    title: "QR leido correctamente",
    detail: "El sistema esta preparando la validacion de identidad.",
  },
  searching: {
    title: "Buscando usuario...",
    detail:
      "Estamos verificando si el DNI del QR corresponde a una persona registrada.",
  },
  found: {
    title: "Usuario encontrado",
    detail: "La persona fue identificada correctamente.",
  },
  invalid: {
    title: "QR invalido",
    detail: "El QR usado es invalido.",
  },
  "camera-not-supported": {
    title: "Camara no disponible",
    detail:
      "El navegador no permite acceder a la camara. Usa la busqueda manual.",
  },
  "camera-not-found": {
    title: "Camara no detectada",
    detail:
      "No se detecto ninguna camara conectada. Podes conectar una webcam o buscar a la persona manualmente.",
  },
  "camera-permission-denied": {
    title: "Permiso de camara bloqueado",
    detail:
      "El permiso de camara esta bloqueado. Habilitalo desde el navegador o usa la busqueda manual.",
  },
  "camera-in-use": {
    title: "Camara en uso",
    detail:
      "No se pudo abrir la camara. Verifica que no este siendo usada por otra aplicacion.",
  },
  "barcode-unsupported": {
    title: "Scanner no compatible",
    detail:
      "El escaneo QR no esta disponible en este navegador. Usa la busqueda manual.",
  },
  "barcode-error": {
    title: "Fallo el detector QR",
    detail:
      "No se pudo leer el QR con el detector del navegador. Podes buscar a la persona manualmente.",
  },
  "scanner-error": {
    title: "No se pudo iniciar el scanner",
    detail:
      "No se pudo iniciar el scanner. Podes buscar a la persona manualmente.",
  },
};

const fallbackStatuses: QrScannerStatus[] = [
  "camera-not-supported",
  "camera-not-found",
  "camera-permission-denied",
  "camera-in-use",
  "barcode-unsupported",
  "barcode-error",
  "scanner-error",
];

export function QrScannerCard({
  videoRef,
  status,
  scanning,
  onStart,
  onStop,
}: Props) {
  const showInvalid = status === "invalid";
  const showFallback = fallbackStatuses.includes(status);
  const currentStatus = statusContent[status];

  return (
    <section className="rounded-[28px] border border-[#DDE8D7] bg-[#EEF6E9] p-5 text-[#173C2A] shadow-sm lg:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-[24px] bg-[#DDEED2] p-3 shadow-sm">
          <div className="relative min-h-[390px] overflow-hidden rounded-[20px] border border-[#C9D9C3] bg-[#0A2F1F] shadow-[inset_0_0_0_1px_rgba(221,239,143,0.18)]">
            <video
              ref={videoRef}
              className="h-full min-h-[390px] w-full object-cover"
              playsInline
              muted
            />

            {!scanning ? (
              <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,rgba(221,239,143,0.12),rgba(10,47,31,0.98)_58%)] text-center text-white">
                <div>
                  <div className="mx-auto grid h-20 w-20 place-items-center rounded-[22px] bg-white/10 text-[#DDEF8F] shadow-[0_18px_45px_rgba(0,0,0,0.18)] ring-1 ring-white/15">
                    <QrCode className="h-10 w-10" />
                  </div>
                  <p className="mt-4 text-lg font-extrabold">
                    Scanner QR preparado
                  </p>
                  <p className="mt-2 max-w-sm text-sm font-medium text-white/75">
                    Inicia el escaneo y acerca el codigo QR a la camara.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="pointer-events-none absolute inset-8 rounded-[22px] border-2 border-[#DDEF8F] shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/35" />
          </div>
        </div>

        <aside className="flex flex-col justify-between rounded-[24px] bg-[#EEF6E9] p-8 text-[#173C2A]">
          <div>
            <div className="flex items-center gap-5">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-[#DDEED2] text-[#00522C]">
                {status === "searching" ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Camera className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#819B56]">
                  Estado
                </p>
                <p className="text-base font-extrabold text-[#003A22]">
                  {currentStatus.title}
                </p>
              </div>
            </div>

            <div className="my-7 h-px bg-[#C9D9C3]" />

            <p className="text-base font-medium leading-6 text-[#315644]">
              {currentStatus.detail}
            </p>

            {showInvalid ? <QrInvalidState /> : null}

            {showFallback ? (
              <div className="mt-6 rounded-[18px] bg-white/55 p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#00522C]" />
                  <p className="text-sm font-semibold leading-5 text-[#315644]">
                    {currentStatus.detail}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-7 grid gap-3">
            <Button
              className="h-12 rounded-xl bg-[#00522C] font-bold text-white hover:bg-[#003A22]"
              onClick={onStart}
              disabled={scanning || status === "searching"}
            >
              <Camera className="h-5 w-5" />
              Iniciar escaneo
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-xl border-[#C9D9C3] bg-white font-bold text-[#173C2A] hover:bg-[#F7FBF5]"
              onClick={onStop}
              disabled={!scanning}
            >
              <Square className="h-5 w-5" />
              Detener escaneo
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-xl border-[#C9D9C3] bg-white font-bold text-[#173C2A] hover:bg-[#DDEF8F]"
            >
              <Link href="/reception/manual">
                <Search className="h-5 w-5" />
                Busqueda manual
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}
