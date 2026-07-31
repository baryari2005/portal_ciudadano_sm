"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";

import type { QrScannerStatus } from "../types/access.types";

type DetectedBarcode = {
  rawValue: string;
};

type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;

type WindowWithBarcodeDetector = Window & {
  BarcodeDetector?: BarcodeDetectorConstructor;
};

type UseQrScannerParams = {
  videoRef: RefObject<HTMLVideoElement | null>;
  onDetected: (value: string) => void;
};

export function useQrScanner({ videoRef, onDetected }: UseQrScannerParams) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<QrScannerStatus | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const fallbackControlsRef = useRef<{ stop: () => void } | null>(null);
  const detectedRef = useRef(false);

  const stop = useCallback(() => {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    fallbackControlsRef.current?.stop();
    fallbackControlsRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setScanning(false);
  }, [videoRef]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("camera-not-supported");
      return;
    }

    const BarcodeDetector = (window as WindowWithBarcodeDetector).BarcodeDetector;

    try {
      detectedRef.current = false;
      setError(null);

      if (navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasCamera = devices.some(
            (device) => device.kind === "videoinput",
          );

          if (!hasCamera) {
            setError("camera-not-found");
            return;
          }
        } catch (error) {
          console.warn(
            "No se pudieron enumerar dispositivos de camara.",
            error,
          );
        }
      }

      if (!BarcodeDetector) {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (!videoRef.current) return;
        setScanning(true);
        const reader = new BrowserQRCodeReader();
        fallbackControlsRef.current = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          videoRef.current,
          (result, error, controls) => {
            if (result && !detectedRef.current) {
              detectedRef.current = true;
              controls.stop();
              onDetected(result.getText());
              setScanning(false);
            } else if (error?.name && !["NotFoundException", "ChecksumException", "FormatException"].includes(error.name)) {
              setError("barcode-error");
            }
          },
        );
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      const detector = new BarcodeDetector({ formats: ["qr_code"] });

      streamRef.current = stream;

      if (!videoRef.current) {
        stop();
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScanning(true);

      const scan = async () => {
        const video = videoRef.current;

        if (!video || detectedRef.current) {
          return;
        }

        try {
          const codes = await detector.detect(video);
          const rawValue = codes[0]?.rawValue;

          if (rawValue) {
            detectedRef.current = true;
            onDetected(rawValue);
            stop();
            return;
          }
        } catch {
          setError("barcode-error");
          stop();
          return;
        }

        frameRef.current = window.requestAnimationFrame(scan);
      };

      frameRef.current = window.requestAnimationFrame(scan);
    } catch (error) {
      console.warn("No se pudo iniciar la camara para escanear QR.", error);
      setError(getCameraErrorStatus(error));
      stop();
    }
  }, [onDetected, stop, videoRef]);

  useEffect(() => stop, [stop]);

  return { scanning, error, start, stop };
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
