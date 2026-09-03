import Link from "next/link";

import { Button } from "@/components/ui/button";

type AccountStatusPageProps = {
  title: string;
  message: string;
};

export function AccountStatusPage({ title, message }: AccountStatusPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
      <section className="w-full max-w-lg rounded-lg border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-[#003A22]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {message}
        </p>
        <Button asChild className="mt-6 bg-[#003A22] hover:bg-[#003A22]/90">
          <Link href="/login">Volver al login</Link>
        </Button>
      </section>
    </main>
  );
}
