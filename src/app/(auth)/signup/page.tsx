import { Metadata } from 'next';
import Link from 'next/link';
import AuthForm from '@/components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Sign Up | TheBodegaCRM',
  description: 'Create a new CRM account',
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold tracking-tight text-slate-900">
            TheBodegaCRM
          </h1>
          <h2 className="mt-6 text-center text-2xl font-bold text-slate-900">
            Create a new account
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Or{' '}
            <Link
              href="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              sign in to your account
            </Link>
          </p>
        </div>
        <AuthForm mode="signup" />
        <div className="text-center text-sm text-slate-500">
          <p>
            All accounts start with a 14-day free trial
          </p>
        </div>
      </div>
    </div>
  );
}
