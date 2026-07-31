import LoginForm from "@/features/auth/components/login-form/LoginForm";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function Page({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextParam = resolvedSearchParams?.next;

  return <LoginForm nextParam={nextParam} />;
}
