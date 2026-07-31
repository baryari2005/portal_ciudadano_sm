"use client";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useQrScanner } from "../hooks/useQrScanner";
import { validateAccessQr } from "../services/access.service";
import type { AccessValidationResponse, QrScannerStatus } from "../types/access.types";
import { AccessResultCard } from "./AccessResultCard";
import { AccessShell } from "./AccessShell";
import { QrScannerCard } from "./QrScannerCard";
export function AccessScanPage() { return <AccessShell title="Escanear QR" description="Validá la credencial personal sin registrar asistencia.">{({ establishmentId }) => <Scan establishmentId={establishmentId}/>}</AccessShell>; }
function Scan({ establishmentId }: { establishmentId: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null); const [status, setStatus] = useState<QrScannerStatus>("idle"); const [result, setResult] = useState<AccessValidationResponse | null>(null); const [error, setError] = useState("");
  const detected = useCallback(async (token: string) => { if (!establishmentId) return; setStatus("searching"); setError(""); try { const response = await validateAccessQr(establishmentId, token); setResult(response); setStatus(response.result === "PERMITIDO" ? "found" : "invalid"); } catch { setError("No pudimos validar el ingreso. Verificá la conexión e intentá nuevamente."); setStatus("scanner-error"); } }, [establishmentId]);
  const scanner = useQrScanner({ videoRef, onDetected: detected });
  function restart() { setResult(null); setError(""); setStatus("scanning"); void scanner.start(); }
  if (!establishmentId) return <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-[#819B56]/40 bg-white text-[#315644]">Seleccioná un establecimiento antes de escanear.</div>;
  return <div className="grid gap-6">{result ? <><AccessResultCard result={result}/><div><Button onClick={restart}>Escanear siguiente</Button></div></> : <QrScannerCard videoRef={videoRef} status={scanner.error ?? status} scanning={scanner.scanning} onStart={restart} onStop={() => { scanner.stop(); setStatus("idle"); }}/>} {error ? <p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}</div>;
}
