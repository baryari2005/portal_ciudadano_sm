import { CompleteProfileForm } from "@/features/auth/components/CompleteProfileForm";

export default function CompletarPerfilPage() {
  return (
    <main className="min-h-screen bg-[#F5F5F5] px-4 py-10">
      <section className="mx-auto max-w-2xl rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-bold text-[#003A22]">
            Completar perfil
          </h1>
          <p className="text-sm text-muted-foreground">
            Necesitamos estos datos obligatorios para finalizar tu alta. Tu
            cuenta quedará pendiente de aprobación por un administrador.
          </p>
        </div>
        <CompleteProfileForm />
      </section>
    </main>
  );
}
