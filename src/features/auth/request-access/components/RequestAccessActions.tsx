"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";

type RequestAccessActionsProps = {
  isSubmitting: boolean;
};

export function RequestAccessActions({
  isSubmitting,
}: RequestAccessActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-[#D7E0D8] pt-6 sm:flex-row sm:justify-end">
      <Button
        asChild
        type="button"
        variant="outline"
        className="h-12 w-full justify-center gap-3 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] px-8 text-base font-bold text-[var(--brand-ink)] shadow-sm hover:bg-[var(--brand-panel)] sm:w-auto"
      >
        <Link href="/login">
          <ArrowLeft className="size-5" aria-hidden="true" />
          Volver al login
        </Link>
      </Button>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full justify-center gap-3 rounded-xl bg-[#014D31] px-8 text-base font-bold text-white shadow-sm hover:bg-[var(--brand-heading)] sm:w-auto"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="size-5" aria-hidden="true" />
            Enviar solicitud
          </>
        )}
      </Button>
    </div>
  );
}
