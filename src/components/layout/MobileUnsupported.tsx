// src/components/MobileUnsupported.tsx
export default function MobileUnsupported() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center gap-5 px-6 text-center bg-white">
      <p className="text-xl font-extrabold tracking-wide text-[var(--brand-primary)]">
        MÁS SAN MIGUEL
      </p>

      <h1 className="text-2xl font-bold">
        No disponible en dispositivos móviles (momentaneamente)
      </h1>

      <p className="text-muted-foreground max-w-md">
        Esta aplicación aún no está optimizada para pantallas pequeñas. Por
        favor, usala desde una computadora o ampliá la ventana del navegador.
      </p>
    </div>
  );
}
