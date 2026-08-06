"use client";

import { useCallback, useRef, useState } from "react";

import { parseQrPayload } from "../helpers/qr.helpers";
import { useFindUserByDni } from "../hooks/useFindUserByDni";
import { useQrScanner } from "../hooks/useQrScanner";
import type { AccessPerson, QrScannerStatus } from "../types/access.types";
import { AccessPageHeader } from "./AccessPageHeader";
import { QrScannerCard } from "./QrScannerCard";
import { UserFoundModal } from "./UserFoundModal";

export function AccessQrPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<QrScannerStatus>("idle");
  const [foundPerson, setFoundPerson] = useState<AccessPerson | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { findByDni } = useFindUserByDni();

  const handleDetected = useCallback(
    async (rawValue: string) => {
      setStatus("read");

      const parsed = parseQrPayload(rawValue);

      if (parsed.type !== "dni") {
        setFoundPerson(null);
        setStatus("invalid");
        return;
      }

      setStatus("searching");
      const person = await findByDni(parsed.value);

      if (!person) {
        setFoundPerson(null);
        setStatus("invalid");
        return;
      }

      setFoundPerson(person);
      setStatus("found");
      setModalOpen(true);
    },
    [findByDni],
  );

  const scanner = useQrScanner({
    videoRef,
    onDetected: handleDetected,
  });

  function handleStart() {
    setFoundPerson(null);
    setStatus("scanning");
    void scanner.start();
  }

  function handleStop() {
    scanner.stop();
    setStatus("idle");
  }

  const scannerStatus = scanner.error ?? status;

  return (
    <div className="grid min-h-[calc(100dvh-var(--topbar-h)-48px)] gap-6 bg-[var(--brand-page)] p-8">
      <AccessPageHeader
        title="Validar QR"
        description="Escanea el QR de la persona para verificar su identidad."
      />

      <QrScannerCard
        videoRef={videoRef}
        status={scannerStatus}
        scanning={scanner.scanning}
        onStart={handleStart}
        onStop={handleStop}
      />

      <UserFoundModal
        person={foundPerson}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
