import Link from "next/link";

import { ForgotPasswordPageForm } from "@/features/auth/components/ForgotPasswordPageForm";

export default function OlvidePasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
      <section className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--brand-heading)]">
          Olvidé mi contraseña
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ingresá tu email y te enviaremos instrucciones si existe una cuenta
          tradicional asociada.
        </p>
        <div className="mt-6">
          <ForgotPasswordPageForm />
        </div>
        <Link
          href="/login"
          className="mt-5 inline-flex text-sm font-semibold text-[var(--brand-heading)] underline-offset-4 hover:underline"
        >
          Volver al login
        </Link>
      </section>
    </main>
  );
}
