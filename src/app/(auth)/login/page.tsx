import { Metadata } from 'next';
import Link from 'next/link';
import AuthForm from '@/components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Login | TheBodegaCRM',
  description: 'Sign in to your CRM account',
};

export default function LoginPage() {
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
        <AuthForm mode="login" />
        <div className="text-center text-sm text-slate-500">
          <p>
            Demo credentials: admin@example.com / password
          </p>
        </div>
      </div>
    </div>
  );
}
