"use client";

type Props = {
  hint?: string;
};

export function DisabledOverlay({ hint }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-muted/50 px-4 backdrop-blur-[1px]">
      <span className="max-w-[280px] whitespace-pre-line rounded-md border bg-background/95 px-3 py-2 text-center text-xs font-medium leading-relaxed text-muted-foreground shadow-sm">
        {hint ?? "Funcionalidad no implementada"}
      </span>
    </div>
  );
}
