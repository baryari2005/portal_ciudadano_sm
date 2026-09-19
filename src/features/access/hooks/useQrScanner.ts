"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";

import type { QrScannerStatus } from "../types/access.types";

type UseQrScannerParams = {
  videoRef: RefObject<HTMLVideoElement | null>;
  onDetected: (value: string) => void;
};

export function useQrScanner({ videoRef, onDetected }: UseQrScannerParams) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<QrScannerStatus | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const scannerRef = useRef<QrScanner | null>(null);
  const detectedRef = useRef(false);

  const stop = useCallback(() => {
    scannerRef.current?.stop();
    setScanning(false);
    setFlashOn(false);
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("camera-not-supported");
      return;
    }

    if (!(await QrScanner.hasCamera())) {
      setError("camera-not-found");
      return;
    }

    try {
      detectedRef.current = false;
      setError(null);

      if (!videoRef.current) return;

      if (!scannerRef.current) {
        scannerRef.current = new QrScanner(
          videoRef.current,
          (result) => {
            if (detectedRef.current) return;
            detectedRef.current = true;
            onDetected(result.data);
            stop();
          },
          {
            onDecodeError: () => {},
            preferredCamera: "environment",
            maxScansPerSecond: 5,
            highlightScanRegion: false,
            highlightCodeOutline: false,
          },
        );
      }

      await scannerRef.current.start();
      setScanning(true);
      setHasFlash(await scannerRef.current.hasFlash());
    } catch (caught) {
      console.warn("No se pudo iniciar la camara para escanear QR.", caught);
      setError(getCameraErrorStatus(caught));
      stop();
    }
  }, [onDetected, stop, videoRef]);

  const toggleFlash = useCallback(async () => {
    if (!scannerRef.current) return;
    await scannerRef.current.toggleFlash();
    setFlashOn(scannerRef.current.isFlashOn());
  }, []);

  useEffect(() => () => {
    scannerRef.current?.destroy();
    scannerRef.current = null;
  }, []);

  return { scanning, error, hasFlash, flashOn, start, stop, toggleFlash };
}

function getCameraErrorStatus(error: unknown): QrScannerStatus {
  if (!(error instanceof DOMException)) {
    return "scanner-error";
  }

  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "camera-permission-denied";
  }

  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "camera-not-found";
  }

  if (
    error.name === "NotReadableError" ||
    error.name === "TrackStartError" ||
    error.name === "AbortError"
  ) {
    return "camera-in-use";
  }

  return "scanner-error";
}
