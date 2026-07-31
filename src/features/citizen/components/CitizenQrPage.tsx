"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CircleAlert, Loader2, QrCode, RefreshCw, ScanLine, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { citizenPost } from "../services/citizen.service";

type IssueDigitalQrResponse = { token: string; credential: { status: "ACTIVO"; issuedAt: string } };

export function CitizenQrPage() {
  const requestedOnEntry = useRef(false);
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const generateQr = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await citizenPost<IssueDigitalQrResponse>("/qr/issue");
      setImage(await QRCode.toDataURL(result.token, { width: 320, margin: 2, color: { dark: "#003A22", light: "#FFFFFF" } }));
    } catch {
      setImage("");
      setError(true);
      toast.error("No pudimos generar el QR de ingreso.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (requestedOnEntry.current) return;
    requestedOnEntry.current = true;
    void generateQr();
  }, [generateQr]);

  return (
    <div className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[#F7FBF5] p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[#1D4F36] sm:text-4xl">Mi QR de ingreso</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#315644]/80 sm:text-base">Generá una credencial digital para presentar en recepción.</p>
      </header>

      <section className="mt-6 overflow-hidden rounded-3xl border border-[#819B56]/20 bg-white/80 text-[#173C2A] shadow-sm">
        {loading ? (
          <div className="grid min-h-[430px] place-items-center p-6 text-center"><div><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#EEF6E9] text-[#1D4F36]"><Loader2 className="size-8 animate-spin" /></div><p className="mt-5 text-lg font-extrabold text-[#003A22]">Generando un QR seguro...</p><p className="mt-1 text-sm font-medium text-[#5F6F68]">El QR anterior quedará inhabilitado.</p></div></div>
        ) : error ? (
          <div className="grid min-h-[430px] place-items-center p-6 text-center"><div><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-50 text-red-700"><CircleAlert className="size-8" /></div><p className="mt-5 text-lg font-extrabold text-[#003A22]">No pudimos generar el QR</p><p className="mt-1 text-sm font-medium text-[#5F6F68]">Revisá la conexión y volvé a intentarlo.</p><Button className="mt-5 h-12 rounded-xl bg-[#014D31] px-8 text-base font-bold hover:bg-[#003A22]" onClick={() => void generateQr()}><RefreshCw className="size-5" />Volver a intentar</Button></div></div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(360px,0.95fr)_minmax(360px,1.05fr)]">
            <div className="grid place-items-center border-b border-[#DDE8D7] p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#1D4F36] text-white shadow-sm"><QrCode className="size-7" /></div>
                <h2 className="mt-4 text-xl font-extrabold text-[#003A22]">Credencial digital activa</h2>
                <p className="mt-1 text-sm font-medium text-[#5F6F68]">Acercá este código al lector de recepción.</p>
                <div className="mx-auto mt-5 inline-block rounded-[24px] border border-[#C9D9C3] bg-[#F7FBF5] p-4 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="QR digital de ingreso" className="size-60 sm:size-72" />
                </div>
              </div>
            </div>

            <aside className="bg-[#EEF6E9] p-6 sm:p-8">
              <div className="flex items-start gap-4"><div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#1D4F36] text-white shadow-sm"><ShieldCheck className="size-7" /></div><div><p className="text-xs font-bold uppercase tracking-wide text-[#819B56]">Estado</p><h2 className="mt-1 text-2xl font-extrabold text-[#1D4F36]">Listo para presentar</h2></div></div>
              <div className="mt-7 grid gap-3">
                <div className="flex gap-3 rounded-[18px] border border-[#D7E0D8] bg-white/60 p-4"><ScanLine className="mt-0.5 size-5 shrink-0 text-[#1D4F36]" /><div><p className="font-extrabold text-[#173C2A]">Un solo intento</p><p className="mt-1 text-sm font-medium leading-5 text-[#5F6F68]">Recepción invalidará este QR después de escanearlo, tanto si el ingreso es autorizado como si es rechazado.</p></div></div>
                <div className="flex gap-3 rounded-[18px] border border-[#D7E0D8] bg-white/60 p-4"><RefreshCw className="mt-0.5 size-5 shrink-0 text-[#1D4F36]" /><div><p className="font-extrabold text-[#173C2A]">Siempre usá el más reciente</p><p className="mt-1 text-sm font-medium leading-5 text-[#5F6F68]">Si generás uno nuevo, esta credencial dejará de funcionar inmediatamente.</p></div></div>
              </div>
              <div className="mt-7 border-t border-[#C9D9C3] pt-6"><Button variant="outline" className="h-12 w-full rounded-xl border-[#C9D9C3] bg-white px-6 text-base font-bold text-[#173C2A] shadow-sm hover:bg-[#F7FBF5]" onClick={() => void generateQr()}><RefreshCw className="size-5" />Generar un nuevo QR</Button></div>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
