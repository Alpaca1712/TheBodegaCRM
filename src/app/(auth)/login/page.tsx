import { Metadata } from 'next';
import Link from 'next/link';
import AuthForm from '@/components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Login | TheBodegaCRM',
  description: 'Sign in to your CRM account',
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params.error;
  const infoMessage = params.message;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold tracking-tight text-slate-900">
            TheBodegaCRM
          </h1>
          <h2 className="mt-6 text-center text-2xl font-bold text-slate-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Or{' '}
            <Link
              href="/signup"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              create a new account
            </Link>
          </p>
        </div>
        {errorMessage && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}
        {infoMessage && (
          <div className="rounded-md bg-blue-50 p-4">
            <p className="text-sm text-blue-800">{infoMessage}</p>
          </div>
        )}
        <AuthForm mode="login" />
      </div>
    </div>
  );
}
