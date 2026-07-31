"use client";

export function Forbidden() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-semibold">403</h1>
        <p className="text-muted-foreground">
          No tienes permisos para acceder a esta sección.
        </p>
      </div>
    </div>
  );
}
