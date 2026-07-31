import type { Metadata } from "next";
import { ResetPasswordGate } from "@/features/auth/components/ResetPasswordGate"; // asumimos export nombrado

export const metadata: Metadata = { title: "Restablecer contraseña" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams?: SP }) {
  const sp = (await searchParams) ?? {};
  const raw = sp.token;
  const token = Array.isArray(raw) ? raw[0] : (raw ?? "");
  return <ResetPasswordGate token={token} />;
}
