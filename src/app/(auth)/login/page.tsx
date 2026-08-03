import LoginForm from "@/features/auth/components/login-form/LoginForm";
import { getGeneralSettings } from "@/features/general-settings/services/general-settings.server";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function Page({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextParam = resolvedSearchParams?.next;

  const settings = await getGeneralSettings().catch(() => null);
  return <LoginForm nextParam={nextParam} imageSources={settings?.loginCollageImages} />;
}
