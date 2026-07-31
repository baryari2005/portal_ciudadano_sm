// src/components/MobileUnsupported.tsx
import Image from "next/image";

export default function MobileUnsupported() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center gap-5 px-6 text-center bg-white">
      {/* Logo arriba */}
      <Image
        src="/logoentero.png" // /public/recibodigital-logo.svg
        alt="ReciboDigital"
        width={160}
        height={80}
        priority
        className="h-25 w-auto dark:invert-0"
      />

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
