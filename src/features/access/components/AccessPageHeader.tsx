"use client";

type Props = {
  title: string;
  description: string;
};

export function AccessPageHeader({ title, description }: Props) {
  return (
    <header>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-secondary)]">
        Accesos
      </p>
      <h1 className="mt-2 text-3xl font-extrabold text-[var(--brand-heading)]">{title}</h1>
      <p className="mt-2 max-w-2xl text-base font-medium text-[var(--brand-text)]">
        {description}
      </p>
    </header>
  );
}
