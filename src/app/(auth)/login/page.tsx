import { Metadata } from 'next';
import AuthForm from '@/components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Login | Bodega',
  description: 'Sign in to the Bodega console',
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Bodega</h1>
          <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Pigeon Labs console. Accounts are created in Supabase Auth.
          </p>
        </div>
        {params.error && (
          <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-red-800">{params.error}</p></div>
        )}
        {params.message && (
          <div className="rounded-md bg-blue-50 p-4"><p className="text-sm text-blue-800">{params.message}</p></div>
        )}
        <AuthForm />
      </div>
    </div>
  );
}
